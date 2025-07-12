// JavaScript for AUV Simulation Frontend
class AUVSimulationUI {
    constructor() {
        this.isRunning = false;
        this.currentState = null;
        this.concentrationHistory = [];
        this.energyHistory = [];
        
        this.initializeEventListeners();
        this.initializePlots();
    }

    initializeEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.startSimulation());
        document.getElementById('step-btn').addEventListener('click', () => this.stepSimulation());
        document.getElementById('run-btn').addEventListener('click', () => this.runMultipleSteps());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetSimulation());
    }

    initializePlots() {
        // Initialize main plot
        const layout = {
            title: 'AUV Trajectory & Plume Field',
            xaxis: { title: 'X Position (m)', range: [0, 100] },
            yaxis: { title: 'Y Position (m)', range: [0, 100] },
            aspectratio: { x: 1, y: 1 },
            showlegend: true
        };
        
        Plotly.newPlot('main-plot', [], layout);
        
        // Initialize energy plot
        const energyLayout = {
            title: 'Energy Over Time',
            xaxis: { title: 'Time Step' },
            yaxis: { title: 'Energy (units)' },
            margin: { t: 50, r: 20, b: 50, l: 60 }
        };
        
        Plotly.newPlot('energy-plot', [], energyLayout);
        
        // Initialize concentration plot
        const concentrationLayout = {
            title: 'Concentration Readings',
            xaxis: { title: 'Time Step' },
            yaxis: { title: 'Concentration' },
            margin: { t: 50, r: 20, b: 50, l: 60 }
        };
        
        Plotly.newPlot('concentration-plot', [], concentrationLayout);
    }

    async startSimulation() {
        const startX = parseFloat(document.getElementById('start-x').value);
        const startY = parseFloat(document.getElementById('start-y').value);
        
        try {
            const response = await fetch('/api/start_simulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_x: startX, start_y: startY })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.currentState = data.initial_state;
                this.concentrationHistory = [];
                this.energyHistory = [];
                
                this.updateUI();
                this.enableControls();
                await this.updatePlots();
                
                this.showMessage('Simulation started successfully!', 'success');
            } else {
                this.showMessage('Failed to start simulation', 'error');
            }
        } catch (error) {
            console.error('Error starting simulation:', error);
            this.showMessage('Error starting simulation', 'error');
        }
    }

    async stepSimulation() {
        try {
            const response = await fetch('/api/step', { method: 'POST' });
            const data = await response.json();
            
            if (data.status === 'success') {
                this.currentState = data.state;
                this.concentrationHistory.push(data.step_result.concentration);
                this.energyHistory.push(data.step_result.energy);
                
                this.updateUI();
                await this.updatePlots();
                
                if (!this.currentState.operational) {
                    this.disableControls();
                    this.showMessage('AUV energy depleted!', 'warning');
                }
            } else {
                this.showMessage(data.message || 'Step failed', 'error');
            }
        } catch (error) {
            console.error('Error stepping simulation:', error);
            this.showMessage('Error during simulation step', 'error');
        }
    }

    async runMultipleSteps() {
        try {
            const response = await fetch('/api/run_multiple_steps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ num_steps: 5 })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.currentState = data.final_state;
                
                // Add new data to history
                data.results.forEach(result => {
                    this.concentrationHistory.push(result.concentration);
                    this.energyHistory.push(result.energy);
                });
                
                this.updateUI();
                await this.updatePlots();
                
                if (!this.currentState.operational) {
                    this.disableControls();
                    this.showMessage('AUV energy depleted!', 'warning');
                }
            } else {
                this.showMessage('Multi-step run failed', 'error');
            }
        } catch (error) {
            console.error('Error running multiple steps:', error);
            this.showMessage('Error during multi-step run', 'error');
        }
    }

    async resetSimulation() {
        this.currentState = null;
        this.concentrationHistory = [];
        this.energyHistory = [];
        
        this.updateUI();
        this.disableControls();
        this.clearPlots();
        
        this.showMessage('Simulation reset', 'info');
    }

    updateUI() {
        if (!this.currentState) {
            document.getElementById('auv-position').textContent = '-';
            document.getElementById('auv-energy').textContent = '-';
            document.getElementById('time-step').textContent = '-';
            document.getElementById('sensor-count').textContent = '-';
            document.getElementById('energy-fill').style.width = '100%';
            return;
        }
        
        const pos = this.currentState.auv_position;
        document.getElementById('auv-position').textContent = `(${pos[0].toFixed(1)}, ${pos[1].toFixed(1)})`;
        document.getElementById('auv-energy').textContent = `${this.currentState.energy.toFixed(1)}`;
        document.getElementById('time-step').textContent = this.currentState.time_step;
        document.getElementById('sensor-count').textContent = this.currentState.sensor_readings;
        
        // Update energy bar
        const energyPercent = (this.currentState.energy / 1000) * 100;
        document.getElementById('energy-fill').style.width = `${energyPercent}%`;
        
        // Change energy bar color based on level
        const energyFill = document.getElementById('energy-fill');
        if (energyPercent > 50) {
            energyFill.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
        } else if (energyPercent > 20) {
            energyFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        } else {
            energyFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
        }
    }

    async updatePlots() {
        try {
            // Get plume field data
            const plumeResponse = await fetch('/api/get_plume_field');
            const plumeData = await plumeResponse.json();
            
            // Update main plot with plume field and trajectory
            await this.updateMainPlot(plumeData);
            
            // Update metrics plots
            this.updateMetricsPlots();
            
        } catch (error) {
            console.error('Error updating plots:', error);
        }
    }

    async updateMainPlot(plumeData) {
        const traces = [];
        
        // Plume field heatmap
        traces.push({
            z: plumeData.plume_field,
            x: plumeData.domain_x,
            y: plumeData.domain_y,
            type: 'heatmap',
            colorscale: 'Viridis',
            showscale: true,
            name: 'Plume Concentration',
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>Concentration: %{z:.3f}<extra></extra>'
        });
        
        // Flow field vectors (simplified)
        const step = 10;
        const flowX = [];
        const flowY = [];
        const flowU = [];
        const flowV = [];
        
        for (let i = 0; i < plumeData.domain_x.length; i += step) {
            for (let j = 0; j < plumeData.domain_y.length; j += step) {
                flowX.push(plumeData.domain_x[i]);
                flowY.push(plumeData.domain_y[j]);
                flowU.push(plumeData.flow_field[0][j][i] * 5); // Scale for visibility
                flowV.push(plumeData.flow_field[1][j][i] * 5);
            }
        }
        
        // Add flow vectors as annotations (simplified approach)
        
        // AUV trajectory
        if (this.currentState && this.currentState.auv_trajectory.length > 0) {
            const trajectory = this.currentState.auv_trajectory;
            const trajX = trajectory.map(pos => pos[0]);
            const trajY = trajectory.map(pos => pos[1]);
            
            traces.push({
                x: trajX,
                y: trajY,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'AUV Trajectory',
                line: { color: 'red', width: 3 },
                marker: { color: 'red', size: 6 }
            });
            
            // Current AUV position
            const currentPos = this.currentState.auv_position;
            traces.push({
                x: [currentPos[0]],
                y: [currentPos[1]],
                type: 'scatter',
                mode: 'markers',
                name: 'Current AUV Position',
                marker: { 
                    color: 'yellow',
                    size: 15,
                    symbol: 'diamond',
                    line: { color: 'red', width: 2 }
                }
            });
        }
        
        const layout = {
            title: 'AUV Trajectory & Plume Field',
            xaxis: { title: 'X Position (m)', range: [0, 100] },
            yaxis: { title: 'Y Position (m)', range: [0, 100] },
            aspectratio: { x: 1, y: 1 },
            showlegend: true
        };
        
        Plotly.react('main-plot', traces, layout);
    }

    updateMetricsPlots() {
        // Update energy plot
        if (this.energyHistory.length > 0) {
            const energyTrace = {
                x: Array.from({length: this.energyHistory.length}, (_, i) => i),
                y: this.energyHistory,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Energy',
                line: { color: '#3498db', width: 2 },
                marker: { color: '#3498db', size: 4 }
            };
            
            const energyLayout = {
                title: 'Energy Over Time',
                xaxis: { title: 'Time Step' },
                yaxis: { title: 'Energy (units)' },
                margin: { t: 50, r: 20, b: 50, l: 60 }
            };
            
            Plotly.react('energy-plot', [energyTrace], energyLayout);
        }
        
        // Update concentration plot
        if (this.concentrationHistory.length > 0) {
            const concentrationTrace = {
                x: Array.from({length: this.concentrationHistory.length}, (_, i) => i),
                y: this.concentrationHistory,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Concentration',
                line: { color: '#27ae60', width: 2 },
                marker: { color: '#27ae60', size: 4 }
            };
            
            const concentrationLayout = {
                title: 'Concentration Readings',
                xaxis: { title: 'Time Step' },
                yaxis: { title: 'Concentration' },
                margin: { t: 50, r: 20, b: 50, l: 60 }
            };
            
            Plotly.react('concentration-plot', [concentrationTrace], concentrationLayout);
        }
    }

    clearPlots() {
        Plotly.purge('main-plot');
        Plotly.purge('energy-plot');
        Plotly.purge('concentration-plot');
        this.initializePlots();
    }

    enableControls() {
        document.getElementById('step-btn').disabled = false;
        document.getElementById('run-btn').disabled = false;
    }

    disableControls() {
        document.getElementById('step-btn').disabled = true;
        document.getElementById('run-btn').disabled = true;
    }

    showMessage(message, type = 'info') {
        // Create a simple message display
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        switch (type) {
            case 'success':
                messageDiv.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
                break;
            case 'error':
                messageDiv.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                break;
            case 'warning':
                messageDiv.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
                break;
            default:
                messageDiv.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
        }
        
        document.body.appendChild(messageDiv);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// Initialize the simulation UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AUVSimulationUI();
});

// Add slideIn animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);