# 🌊 PCMTF for AUV - Interactive Simulation

**Physics-Constrained Meta-Transformer Framework for AUV Plume Tracking in Turbulent Ocean Environments**

An advanced interactive web-based simulation for autonomous underwater vehicle (AUV) plume tracking using physics-informed neural networks and energy-optimal trajectory planning.

![AUV Simulation Interface](https://github.com/user-attachments/assets/81f793ee-2af3-4866-9d55-fc7f9ce57181)

## 🚀 Features

- **Interactive Web Interface**: Beautiful, responsive web-based simulation control panel
- **Physics-Informed Neural Network (PINN)**: Learns turbulent plume dynamics from sparse sensor data
- **Energy-Optimal Trajectory Planning**: Minimizes energy consumption while maximizing plume coverage
- **Real-Time Visualization**: Dynamic plots showing plume fields, AUV trajectory, and performance metrics
- **Turbulent Plume Simulation**: Realistic plume dynamics with fragmentation, drift, and noise
- **Responsive Controls**: Start/stop simulation, single-step execution, and parameter adjustment

## 🎯 Simulation Objectives

The AUV must:
1. **Locate methane plumes** in a turbulent ocean environment
2. **Track plume dynamics** using sparse sensor measurements
3. **Optimize energy consumption** while maintaining effective coverage
4. **Adapt to changing conditions** through continuous learning

## 🧠 Technical Approach

### Physics-Informed Neural Network (PINN)
- Incorporates Navier-Stokes equations as soft constraints
- Learns from sparse sensor data (concentration and flow measurements)
- Reconstructs full plume field from limited observations

### Energy-Optimal Control
- Quadratic energy consumption model based on speed
- Multi-objective optimization: maximize plume coverage, minimize energy
- Real-time trajectory planning using scipy optimization

### Turbulent Environment Simulation
- Dynamic plume sources with temporal variations
- Fragmentation effects simulating high Reynolds number turbulence
- Realistic flow fields with vortex patterns and noise

## 🛠️ Installation & Setup

### Prerequisites
```bash
# Install required packages
sudo apt update
sudo apt install -y python3-numpy python3-matplotlib python3-flask python3-scipy
```

### Running the Simulation
```bash
# Clone the repository
git clone https://github.com/Anmol-Josan/PCMTF-for-AUV.git
cd PCMTF-for-AUV

# Start the web server
python3 app.py

# Open your browser and navigate to:
# http://localhost:5000
```

## 🎮 How to Use

![Simulation Running](https://github.com/user-attachments/assets/60a11a0c-28aa-4b7d-bf37-4c36583605fe)

1. **Set Starting Position**: Adjust AUV Start X and Y coordinates (0-100)
2. **Start Simulation**: Click "🚀 Start Simulation" to initialize
3. **Control Execution**:
   - **Single Step**: Execute one simulation step at a time
   - **Run 5 Steps**: Execute multiple steps automatically
   - **Reset**: Restart the simulation with new parameters

### Real-Time Monitoring
- **Position**: Current AUV coordinates
- **Energy**: Remaining battery power (starts at 1000 units)
- **Time Step**: Simulation progress counter
- **Sensors**: Number of measurements collected
- **Energy Bar**: Visual energy level indicator (green → yellow → red)

## 📊 Visualizations

The interface provides three main visualization areas:

1. **Plume Field & AUV Trajectory**: 
   - Heatmap of methane concentration
   - AUV path and current position
   - Flow field vectors

2. **Performance Metrics**:
   - Energy consumption over time
   - Concentration readings history

## 🏗️ Architecture

### Core Components

**`auv_simulation.py`** - Main simulation engine
- `PlumeEnvironment`: Generates dynamic turbulent plumes
- `AUV`: Vehicle model with energy consumption
- `SimplePINN`: Physics-informed neural network
- `TrajectoryOptimizer`: Energy-optimal path planning
- `AUVSimulation`: Main simulation coordinator

**`app.py`** - Flask web server
- REST API endpoints for simulation control
- Real-time data serving
- JSON serialization handling

**Frontend** - Interactive web interface
- Modern responsive design with CSS Grid/Flexbox
- Real-time plotting with Plotly.js
- Asynchronous API communication

### API Endpoints

- `POST /api/start_simulation` - Initialize simulation
- `POST /api/step` - Execute single simulation step
- `POST /api/run_multiple_steps` - Execute multiple steps
- `GET /api/get_plume_field` - Retrieve current plume data
- `GET /api/get_state` - Get simulation state
- `POST /api/set_auv_position` - Manually set AUV position

## 🔬 Scientific Background

This simulation implements cutting-edge research in:

- **Physics-Informed Machine Learning**: Incorporating known physics laws into neural network training
- **Autonomous Ocean Exploration**: Energy-efficient underwater vehicle navigation
- **Turbulent Flow Modeling**: Realistic simulation of ocean turbulence effects
- **Multi-Objective Optimization**: Balancing exploration and energy conservation

## 🚧 Future Enhancements

- **3D Environment**: Extend to full 3D plume tracking
- **Multi-AUV Coordination**: Cooperative swarm behavior
- **Advanced PINN Models**: More sophisticated neural architectures
- **Real Sensor Integration**: Connect to actual AUV hardware
- **Machine Learning Improvements**: Enhanced learning algorithms

## 📝 Technical Details

### Plume Dynamics Model
```python
# Dynamic plume with turbulent fragmentation
C_main = exp(-((X - center_x)² + (Y - center_y)²) / (2 * σ²))
# Secondary fragmented plumes
C_secondary = Σ exp(-((X - frag_x)² + (Y - frag_y)²) / (2 * σ_frag²))
```

### Energy Consumption Model
```python
# Quadratic energy cost with base consumption
energy_cost = 0.1 * speed² + 1.0  # per time step
```

### Physics Constraints (PINN)
```python
# Advection-diffusion equation residual
residual = u·∇C + v·∇C - D·∇²C
physics_loss = mean(residual²)
```

## 🤝 Contributing

This project welcomes contributions! Areas for improvement:
- Enhanced visualization features
- More sophisticated PINN architectures
- Additional optimization algorithms
- Performance improvements

## 📄 License

This project is part of ongoing research in autonomous ocean exploration and physics-informed machine learning.

---

**Research Focus**: Advancing autonomous underwater vehicle capabilities for environmental monitoring and climate change research through intelligent, energy-efficient plume tracking systems.
