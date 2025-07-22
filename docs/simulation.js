// Data Preparation
const gridSize = 100;
const x = Array.from({length: gridSize}, (_, i) => i);
const y = Array.from({length: gridSize}, (_, i) => i);

function plumeConcentration(x, y, center = [50, 50], sigma = 15) {
  return Math.exp(-((x - center[0]) ** 2 + (y - center[1]) ** 2) / (2 * sigma ** 2));
}

let C = [];
let u = [];
let v = [];
for (let i = 0; i < gridSize; i++) {
  C[i] = [];
  u[i] = [];
  v[i] = [];
  for (let j = 0; j < gridSize; j++) {
    C[i][j] = plumeConcentration(x[i], y[j]) + 0.1 * (Math.random() - 0.5);
    u[i][j] = - (y[j] - 50) / 50 + 0.05 * (Math.random() - 0.5);
    v[i][j] = (x[i] - 50) / 50 + 0.05 * (Math.random() - 0.5);
  }
}

const numSensors = 30;
let sensor_x = [], sensor_y = [], sensor_c = [], sensor_u = [], sensor_v = [];
for (let i = 0; i < numSensors; i++) {
  let sx = Math.random() * 100;
  let sy = Math.random() * 100;
  sensor_x.push(sx);
  sensor_y.push(sy);
  sensor_c.push(plumeConcentration(sx, sy) + 0.1 * (Math.random() - 0.5));
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

  Plotly.newPlot('main-plot', [trace, sensors], {
    title: 'Synthetic Plume Field and Sparse Sensor Data',
    xaxis: { title: 'X (m)' },
    yaxis: { title: 'Y (m)' }
  });
}

// PINN Model (TensorFlow.js)
const model = tf.sequential();
model.add(tf.layers.dense({inputShape: [2], units: 64, activation: 'tanh'}));
model.add(tf.layers.dense({units: 64, activation: 'tanh'}));
model.add(tf.layers.dense({units: 64, activation: 'tanh'}));
model.add(tf.layers.dense({units: 1}));
model.compile({optimizer: 'adam', loss: 'meanSquaredError'});

const trainX = tf.tensor2d(sensor_x.map((v, i) => [v, sensor_y[i]]));
const trainY = tf.tensor2d(sensor_c, [sensor_c.length, 1]);

async function trainPINN() {
  await model.fit(trainX, trainY, {epochs: 100});
  alert('PINN training complete!');
}
