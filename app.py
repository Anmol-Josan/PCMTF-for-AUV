#!/usr/bin/env python3
"""
Flask web application for AUV Plume Tracking Simulation
"""

from flask import Flask, render_template, jsonify, request
import json
import numpy as np
from auv_simulation import AUVSimulation

app = Flask(__name__)

# Global simulation instance
simulation = AUVSimulation()

@app.route('/')
def index():
    """Main simulation interface"""
    return render_template('index.html')

@app.route('/api/start_simulation', methods=['POST'])
def start_simulation():
    """Start or restart simulation"""
    data = request.get_json()
    start_x = data.get('start_x', 20)
    start_y = data.get('start_y', 20)
    
    # Reset simulation with new starting position
    simulation.reset((start_x, start_y))
    
    return jsonify({
        'status': 'success',
        'message': 'Simulation started',
        'initial_state': simulation.get_state()
    })

@app.route('/api/step', methods=['POST'])
def step_simulation():
    """Run one simulation step"""
    if not simulation.auv.is_operational():
        return jsonify({
            'status': 'error',
            'message': 'AUV is not operational (out of energy)'
        })
    
    # Run simulation step
    step_result = simulation.run_simulation_step()
    
    # Get current state
    state = simulation.get_state()
    
    return jsonify({
        'status': 'success',
        'step_result': {
            'auv_position': step_result['auv_position'].tolist(),
            'concentration': float(step_result['concentration']),
            'energy': float(step_result['energy']),
            'plume_field': step_result['plume_field'].tolist(),
            'flow_field': [step_result['flow_field'][0].tolist(), step_result['flow_field'][1].tolist()]
        },
        'state': state
    })

@app.route('/api/run_multiple_steps', methods=['POST'])
def run_multiple_steps():
    """Run multiple simulation steps"""
    data = request.get_json()
    num_steps = data.get('num_steps', 5)
    
    results = []
    for i in range(num_steps):
        if not simulation.auv.is_operational():
            break
        
        step_result = simulation.run_simulation_step()
        results.append({
            'step': simulation.time_step,
            'auv_position': step_result['auv_position'].tolist(),
            'concentration': float(step_result['concentration']),
            'energy': float(step_result['energy'])
        })
    
    return jsonify({
        'status': 'success',
        'results': results,
        'final_state': simulation.get_state()
    })

@app.route('/api/get_plume_field', methods=['GET'])
def get_plume_field():
    """Get current plume field data"""
    plume_field = simulation.plume_env.get_plume_concentration(simulation.time_step)
    flow_field = simulation.plume_env.get_flow_field(simulation.time_step)
    
    return jsonify({
        'plume_field': plume_field.tolist(),
        'flow_field': [flow_field[0].tolist(), flow_field[1].tolist()],
        'domain_x': simulation.plume_env.x.tolist(),
        'domain_y': simulation.plume_env.y.tolist()
    })

@app.route('/api/get_state', methods=['GET'])
def get_state():
    """Get current simulation state"""
    return jsonify(simulation.get_state())

@app.route('/api/set_auv_position', methods=['POST'])
def set_auv_position():
    """Manually set AUV position"""
    data = request.get_json()
    new_x = data.get('x', simulation.auv.position[0])
    new_y = data.get('y', simulation.auv.position[1])
    
    # Update position
    simulation.auv.position = np.array([new_x, new_y])
    simulation.auv.trajectory.append(simulation.auv.position.copy())
    
    return jsonify({
        'status': 'success',
        'new_position': simulation.auv.position.tolist(),
        'state': simulation.get_state()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)