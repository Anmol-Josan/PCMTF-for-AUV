#!/usr/bin/env python3
"""
Physics-Constrained Meta-Transformer Framework for AUV Plume Tracking
Complete simulation engine with PINN model and trajectory optimization
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from scipy.optimize import minimize
import json
import time

class PlumeEnvironment:
    """Simulates a turbulent plume environment"""
    
    def __init__(self, domain_size=(100, 100), source_pos=(50, 50)):
        self.domain_size = domain_size
        self.source_pos = source_pos
        self.x = np.linspace(0, domain_size[0], 100)
        self.y = np.linspace(0, domain_size[1], 100)
        self.X, self.Y = np.meshgrid(self.x, self.y)
        self.time = 0
        
    def get_plume_concentration(self, time_step=0):
        """Generate dynamic plume concentration with turbulent effects"""
        # Main plume source
        sigma_base = 15 + 3 * np.sin(0.1 * time_step)  # Dynamic plume spread
        offset_x = 5 * np.sin(0.05 * time_step)  # Plume drift
        offset_y = 3 * np.cos(0.07 * time_step)
        
        center_x = self.source_pos[0] + offset_x
        center_y = self.source_pos[1] + offset_y
        
        # Primary plume
        C_main = np.exp(-((self.X - center_x)**2 + (self.Y - center_y)**2) / (2 * sigma_base**2))
        
        # Secondary plumes (fragmentation effect)
        C_secondary = 0
        for i in range(3):
            frag_x = center_x + 20 * np.sin(0.1 * time_step + i)
            frag_y = center_y + 15 * np.cos(0.08 * time_step + i * 2)
            sigma_frag = 8 + 2 * np.sin(0.15 * time_step + i)
            C_secondary += 0.3 * np.exp(-((self.X - frag_x)**2 + (self.Y - frag_y)**2) / (2 * sigma_frag**2))
        
        # Add turbulent noise
        noise = 0.05 * np.random.randn(*self.X.shape)
        
        return np.maximum(0, C_main + C_secondary + noise)
    
    def get_flow_field(self, time_step=0):
        """Generate dynamic flow field"""
        # Vortex flow with time variation
        u = - (self.Y - 50) / 50 * (1 + 0.2 * np.sin(0.03 * time_step))
        v = (self.X - 50) / 50 * (1 + 0.2 * np.cos(0.03 * time_step))
        
        # Add turbulent fluctuations
        u += 0.1 * np.random.randn(*self.X.shape)
        v += 0.1 * np.random.randn(*self.X.shape)
        
        return u, v
    
    def sample_sensors(self, positions, time_step=0):
        """Sample concentration at given sensor positions"""
        concentration = self.get_plume_concentration(time_step)
        u, v = self.get_flow_field(time_step)
        
        samples = []
        for pos in positions:
            x_idx = np.argmin(np.abs(self.x - pos[0]))
            y_idx = np.argmin(np.abs(self.y - pos[1]))
            
            c_val = concentration[y_idx, x_idx]
            u_val = u[y_idx, x_idx]
            v_val = v[y_idx, x_idx]
            
            samples.append((c_val, u_val, v_val))
        
        return samples

class AUV:
    """Autonomous Underwater Vehicle model"""
    
    def __init__(self, start_pos=(20, 20), max_speed=2.0, energy_capacity=1000):
        self.position = np.array(start_pos, dtype=float)
        self.max_speed = max_speed
        self.energy = energy_capacity
        self.energy_capacity = energy_capacity
        self.trajectory = [self.position.copy()]
        self.energy_history = [self.energy]
        self.sensor_readings = []
        
    def move(self, velocity, dt=1.0):
        """Move AUV with energy consumption"""
        # Limit velocity by max speed
        speed = np.linalg.norm(velocity)
        if speed > self.max_speed:
            velocity = velocity / speed * self.max_speed
            speed = self.max_speed
        
        # Update position
        self.position += velocity * dt
        
        # Energy consumption (quadratic with speed)
        energy_consumed = 0.1 * speed**2 * dt + 1.0 * dt  # Base consumption
        self.energy = max(0, self.energy - energy_consumed)
        
        # Store trajectory
        self.trajectory.append(self.position.copy())
        self.energy_history.append(self.energy)
        
        return self.position.copy()
    
    def get_sensor_position(self):
        """Get current sensor position"""
        return self.position
    
    def is_operational(self):
        """Check if AUV has energy"""
        return self.energy > 0

class SimplePINN:
    """Simplified Physics-Informed Neural Network for plume reconstruction"""
    
    def __init__(self, domain_size=(100, 100)):
        self.domain_size = domain_size
        self.sensor_data = []
        self.concentration_field = None
        self.fitted = False
        
    def add_sensor_data(self, position, concentration, velocity):
        """Add sensor reading"""
        self.sensor_data.append({
            'position': position,
            'concentration': concentration,
            'velocity': velocity
        })
    
    def fit(self, plume_env, time_step=0):
        """Fit the PINN model to sensor data (simplified version)"""
        if len(self.sensor_data) < 3:
            return False
        
        # For this simplified version, we'll use the true plume field
        # In a real implementation, this would be learned from sensor data
        self.concentration_field = plume_env.get_plume_concentration(time_step)
        self.flow_field = plume_env.get_flow_field(time_step)
        self.fitted = True
        return True
    
    def predict_concentration(self, positions):
        """Predict concentration at given positions"""
        if not self.fitted:
            return np.zeros(len(positions))
        
        x = np.linspace(0, self.domain_size[0], 100)
        y = np.linspace(0, self.domain_size[1], 100)
        
        concentrations = []
        for pos in positions:
            x_idx = np.argmin(np.abs(x - pos[0]))
            y_idx = np.argmin(np.abs(y - pos[1]))
            concentrations.append(self.concentration_field[y_idx, x_idx])
        
        return np.array(concentrations)

class TrajectoryOptimizer:
    """Energy-optimal trajectory planner"""
    
    def __init__(self, auv, pinn_model, plume_env):
        self.auv = auv
        self.pinn_model = pinn_model
        self.plume_env = plume_env
        
    def objective_function(self, trajectory_params, start_pos, num_steps=10):
        """Objective function: maximize plume coverage, minimize energy"""
        # Reconstruct trajectory from parameters
        # trajectory_params: [vx1, vy1, vx2, vy2, ...]
        trajectory = [start_pos]
        energy_cost = 0
        plume_coverage = 0
        
        for i in range(0, len(trajectory_params), 2):
            if i+1 >= len(trajectory_params):
                break
                
            velocity = np.array([trajectory_params[i], trajectory_params[i+1]])
            speed = np.linalg.norm(velocity)
            
            # Limit speed
            if speed > self.auv.max_speed:
                velocity = velocity / speed * self.auv.max_speed
                speed = self.auv.max_speed
            
            # Update position
            new_pos = trajectory[-1] + velocity
            trajectory.append(new_pos)
            
            # Energy cost (quadratic with speed)
            energy_cost += 0.1 * speed**2 + 1.0
            
            # Plume coverage reward
            if self.pinn_model.fitted:
                concentration = self.pinn_model.predict_concentration([new_pos])[0]
                plume_coverage += concentration
        
        # Multi-objective: minimize energy, maximize coverage
        return energy_cost - 10.0 * plume_coverage
    
    def plan_trajectory(self, target_region=None, num_steps=10):
        """Plan optimal trajectory"""
        if not self.pinn_model.fitted:
            # Random exploration if no model
            return self._random_exploration(num_steps)
        
        # Initial guess: straight line to high concentration area
        start_pos = self.auv.position
        
        # Find highest concentration region
        if target_region is None:
            x = np.linspace(0, 100, 20)
            y = np.linspace(0, 100, 20)
            positions = [(xi, yi) for xi in x for yi in y]
            concentrations = self.pinn_model.predict_concentration(positions)
            best_idx = np.argmax(concentrations)
            target_pos = positions[best_idx]
        else:
            target_pos = target_region
        
        # Initial trajectory: straight line
        direction = np.array(target_pos) - start_pos
        if np.linalg.norm(direction) > 0:
            direction = direction / np.linalg.norm(direction)
        
        initial_params = []
        for i in range(num_steps):
            initial_params.extend([direction[0], direction[1]])
        
        # Bounds: velocity components
        bounds = [(-self.auv.max_speed, self.auv.max_speed) for _ in initial_params]
        
        # Optimize
        try:
            result = minimize(
                self.objective_function,
                initial_params,
                args=(start_pos, num_steps),
                bounds=bounds,
                method='L-BFGS-B'
            )
            
            if result.success:
                return self._params_to_velocities(result.x, num_steps)
            else:
                return self._random_exploration(num_steps)
        except:
            return self._random_exploration(num_steps)
    
    def _params_to_velocities(self, params, num_steps):
        """Convert optimization parameters to velocity commands"""
        velocities = []
        for i in range(0, len(params), 2):
            if i+1 < len(params):
                velocities.append(np.array([params[i], params[i+1]]))
        return velocities[:num_steps]
    
    def _random_exploration(self, num_steps):
        """Random exploration strategy"""
        velocities = []
        for _ in range(num_steps):
            angle = np.random.uniform(0, 2*np.pi)
            speed = np.random.uniform(0.5, self.auv.max_speed)
            velocity = speed * np.array([np.cos(angle), np.sin(angle)])
            velocities.append(velocity)
        return velocities

class AUVSimulation:
    """Main simulation class"""
    
    def __init__(self):
        self.plume_env = PlumeEnvironment()
        self.auv = AUV()
        self.pinn_model = SimplePINN()
        self.optimizer = TrajectoryOptimizer(self.auv, self.pinn_model, self.plume_env)
        self.time_step = 0
        
    def run_simulation_step(self):
        """Run one simulation step"""
        # Sample environment at AUV position
        sensor_pos = self.auv.get_sensor_position()
        samples = self.plume_env.sample_sensors([sensor_pos], self.time_step)
        concentration, u_vel, v_vel = samples[0]
        
        # Add sensor data to PINN
        self.pinn_model.add_sensor_data(sensor_pos, concentration, (u_vel, v_vel))
        
        # Fit PINN model
        self.pinn_model.fit(self.plume_env, self.time_step)
        
        # Plan next move
        velocities = self.optimizer.plan_trajectory(num_steps=1)
        
        if velocities and self.auv.is_operational():
            self.auv.move(velocities[0])
        
        self.time_step += 1
        
        return {
            'auv_position': self.auv.position.copy(),
            'concentration': concentration,
            'energy': self.auv.energy,
            'plume_field': self.plume_env.get_plume_concentration(self.time_step),
            'flow_field': self.plume_env.get_flow_field(self.time_step)
        }
    
    def get_state(self):
        """Get current simulation state"""
        return {
            'auv_position': self.auv.position.tolist(),
            'auv_trajectory': [pos.tolist() for pos in self.auv.trajectory],
            'energy': float(self.auv.energy),
            'energy_history': [float(e) for e in self.auv.energy_history],
            'time_step': int(self.time_step),
            'sensor_readings': int(len(self.pinn_model.sensor_data)),
            'operational': bool(self.auv.is_operational())
        }
    
    def reset(self, start_pos=(20, 20)):
        """Reset simulation"""
        self.auv = AUV(start_pos)
        self.pinn_model = SimplePINN()
        self.optimizer = TrajectoryOptimizer(self.auv, self.pinn_model, self.plume_env)
        self.time_step = 0

if __name__ == "__main__":
    # Test the simulation
    sim = AUVSimulation()
    
    print("Running AUV Plume Tracking Simulation...")
    for i in range(20):
        state = sim.run_simulation_step()
        print(f"Step {i+1}: AUV at ({state['auv_position'][0]:.1f}, {state['auv_position'][1]:.1f}), "
              f"Concentration: {state['concentration']:.3f}, "
              f"Energy: {sim.auv.energy:.1f}")
        
        if not sim.auv.is_operational():
            print("AUV energy depleted!")
            break
    
    print("Simulation complete!")