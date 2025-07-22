// Data Preparation
const gridSize = 100;
const x = Array.from({length: gridSize}, (_, i) => i);
const y = Array.from({length: gridSize}, (_, i) => i);

function plumeConcentration(x, y, center = [50, 50], sigma = 15) {
  // Narrower plume (smaller sigma)
  return Math.exp(-((x - center[0]) ** 2 + (y - center[1]) ** 2) / (2 * 8 ** 2));
}

let C = [];
let u = [];
let v = [];
for (let i = 0; i < gridSize; i++) {
  C[i] = [];
  u[i] = [];
  v[i] = [];
  for (let j = 0; j < gridSize; j++) {
    // Less turbulent: reduce noise amplitude
    C[i][j] = plumeConcentration(x[i], y[j]) + 0.03 * (Math.random() - 0.5);
    u[i][j] = - (y[j] - 50) / 50 + 0.05 * (Math.random() - 0.5);
    v[i][j] = (x[i] - 50) / 50 + 0.05 * (Math.random() - 0.5);
  }
}

const numSensors = 30;
let sensor_x = [], sensor_y = [], sensor_c = [], sensor_u = [], sensor_v = [];
function randomizeField() {
  // Regenerate plume field and sensors
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      C[i][j] = plumeConcentration(x[i], y[j]) + 0.03 * (Math.random() - 0.5);
      u[i][j] = - (y[j] - 50) / 50 + 0.05 * (Math.random() - 0.5);
      v[i][j] = (x[i] - 50) / 50 + 0.05 * (Math.random() - 0.5);
    }
  }
  sensor_x = []; sensor_y = []; sensor_c = []; sensor_u = []; sensor_v = [];
  for (let i = 0; i < numSensors; i++) {
    // Bias sensors toward plume center for easier PINN learning
    let angle = Math.random() * 2 * Math.PI;
    let radius = Math.abs(Math.random() * 30 + Math.random() * 20); // More sensors near center
    let sx = 50 + Math.cos(angle) * radius;
    let sy = 50 + Math.sin(angle) * radius;
    sensor_x.push(sx);
    sensor_y.push(sy);
    sensor_c.push(plumeConcentration(sx, sy) + 0.01 * (Math.random() - 0.5));
    sensor_u.push(- (sy - 50) / 50 + 0.05 * (Math.random() - 0.5));
    sensor_v.push((sx - 50) / 50 + 0.05 * (Math.random() - 0.5));
  }
  plotPlumeField();
}

function runSimulation() {
  // Example: Move AUV, update status, energy, time, etc.
  let auvX = parseFloat(document.getElementById('start-x').value);
  let auvY = parseFloat(document.getElementById('start-y').value);
  let energy = 100;
  let timeStep = 0;
  let trajectory = [{x: auvX, y: auvY}];

  // Simulate 10 steps, bias movement toward plume center
  for (let step = 0; step < 10; step++) {
    let dx = 50 - auvX;
    let dy = 50 - auvY;
    // Move toward center, add small random noise
    auvX += dx * 0.2 + (Math.random() - 0.5) * 1.5;
    auvY += dy * 0.2 + (Math.random() - 0.5) * 1.5;
    energy -= 5;
    timeStep += 1;
    trajectory.push({x: auvX, y: auvY});
  }

  // Update status
  document.getElementById('auv-position').textContent = `${auvX.toFixed(1)}, ${auvY.toFixed(1)}`;
  document.getElementById('auv-energy').textContent = energy;
  document.getElementById('time-step').textContent = timeStep;
  document.getElementById('sensor-count').textContent = numSensors;

  // Plot trajectory on plume field
  plotPlumeField();
  Plotly.addTraces('main-plot', {
    x: trajectory.map(p => p.x),
    y: trajectory.map(p => p.y),
    mode: 'lines+markers',
    type: 'scatter',
    name: 'AUV Trajectory',
    line: {color: 'red', width: 3}
  });
  // Check if AUV reached target
  const distToTarget = Math.sqrt((auvX - 50) ** 2 + (auvY - 50) ** 2);
  if (distToTarget < 15) {
    alert('AUV succeeded! Reached the plume center.');
  } else {
    alert('AUV did not reach the plume center.');
  }
}

for (let i = 0; i < numSensors; i++) {
  let sx = Math.random() * 100;
  let sy = Math.random() * 100;
  sensor_x.push(sx);
  sensor_y.push(sy);
    sensor_c.push(plumeConcentration(sx, sy) + 0.03 * (Math.random() - 0.5));
  sensor_u.push(- (sy - 50) / 50 + 0.05 * (Math.random() - 0.5));
  sensor_v.push((sx - 50) / 50 + 0.05 * (Math.random() - 0.5));
}

// Visualization
function plotPlumeField() {
  const trace = {
    z: C,
    x: x,
    y: y,
    type: 'contour',
    colorscale: 'Viridis',
    contours: { coloring: 'heatmap' }
  };
  const sensors = {
    x: sensor_x,
    y: sensor_y,
    mode: 'markers',
    marker: { color: sensor_c, colorscale: 'Hot', size: 8, line: { color: 'black', width: 1 } },
    type: 'scatter',
    name: 'Sensors'
  };
  // Plume center marker
  const target = {
    x: [50],
    y: [50],
    mode: 'markers',
    marker: { color: 'yellow', size: 16, symbol: 'star' },
    type: 'scatter',
    name: 'Plume Center'
  };
  Plotly.newPlot('main-plot', [trace, sensors, target], {
    title: 'Synthetic Plume Field and Sparse Sensor Data',
    xaxis: { title: 'X (m)' },
    yaxis: { title: 'Y (m)' }
  });
}

// Metric plotting functions
function plotEnergyMetric(energyHistory) {
  const trace = {
    x: Array.from({length: energyHistory.length}, (_, i) => i + 1),
    y: energyHistory,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Energy'
  };
  Plotly.newPlot('energy-plot', [trace], {
    title: 'AUV Energy Over Time',
    xaxis: { title: 'Step' },
    yaxis: { title: 'Energy' }
  });
}

function plotConcentrationMetric(concentrationHistory) {
  const trace = {
    x: Array.from({length: concentrationHistory.length}, (_, i) => i + 1),
    y: concentrationHistory,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Concentration'
  };
  Plotly.newPlot('concentration-plot', [trace], {
    title: 'Plume Concentration Over Time',
    xaxis: { title: 'Step' },
    yaxis: { title: 'Concentration' }
  });
}

// Example metric data (replace with real simulation data)
let energyHistory = [100, 95, 90, 85, 80, 75, 70];
let concentrationHistory = [0.2, 0.25, 0.3, 0.28, 0.35, 0.4, 0.38];

// Plot metrics on page load
window.addEventListener('DOMContentLoaded', () => {
  plotEnergyMetric(energyHistory);
  plotConcentrationMetric(concentrationHistory);
});

// PINN Model (TensorFlow.js)
const model = tf.sequential();
model.add(tf.layers.dense({inputShape: [2], units: 128, activation: 'tanh'}));
model.add(tf.layers.dense({units: 128, activation: 'tanh'}));
model.add(tf.layers.dense({units: 128, activation: 'tanh'}));
model.add(tf.layers.dense({units: 128, activation: 'tanh'}));
model.add(tf.layers.dense({units: 1}));
model.compile({optimizer: 'adam', loss: 'meanSquaredError'});

function getTrainingData() {
  return {
    trainX: tf.tensor2d(sensor_x.map((v, i) => [v, sensor_y[i]])),
    trainY: tf.tensor2d(sensor_c, [sensor_c.length, 1])
  };
}

async function trainPINN() {
  const {trainX, trainY} = getTrainingData();
  await model.fit(trainX, trainY, {epochs: 400});
  alert('PINN training complete!');
}
