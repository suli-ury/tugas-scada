const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const INTERVAL_MS = 6000;

app.use(express.static(path.join(__dirname, 'public')));

const weatherScenarios = [
  { weather: 'Cerah Terik', tempRange: [33.0, 36.5], windRange: [5.0, 12.0], humRange: [45, 60], uvRange: [7, 10], roof: 'MEMBUKA (TEDUH)' },
  { weather: 'Panas Berawan', tempRange: [31.0, 33.5], windRange: [8.0, 15.0], humRange: [60, 70], uvRange: [5, 7], roof: 'MEMBUKA (TEDUH)' },
  { weather: 'Berawan', tempRange: [29.0, 31.5], windRange: [10.0, 18.0], humRange: [70, 78], uvRange: [3, 5], roof: 'MEMBUKA (TEDUH)' },
  { weather: 'Hujan Gerimis', tempRange: [27.0, 29.5], windRange: [14.0, 24.0], humRange: [80, 88], uvRange: [1, 3], roof: 'MENUTUP (PERLINDUNGAN)' },
  { weather: 'Hujan Petir', tempRange: [25.5, 27.5], windRange: [22.0, 35.0], humRange: [89, 98], uvRange: [0, 2], roof: 'MENUTUP (PERLINDUNGAN)' }
];

let scenarioIndex = 0;

let state = {
  temp: 33.5,
  wind: 10.0,
  humidity: 58,
  uv: 8,
  mode: 'AUTO',
  roof: 'MEMBUKA (TEDUH)',
  weather: 'Cerah Terik'
};

function randFloat(min, max) {
  return Number((min + Math.random() * (max - min)).toFixed(1));
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function broadcastState(socketOrIo) {
  socketOrIo.emit('mqtt_status', true);
  socketOrIo.emit('status_mode', state.mode);
  socketOrIo.emit('status_atap', state.roof);
  socketOrIo.emit('status_hujan', state.weather);
  socketOrIo.emit('telemetri_uv', state.uv);
}

io.on('connection', (socket) => {
  socket.emit('initial_state', {
    temp: state.temp.toFixed(1),
    wind: state.wind.toFixed(1),
    humidity: state.humidity
  });
  broadcastState(socket);

  socket.on('set_mode', (mode) => {
    if (mode === 'AUTO' || mode === 'MANUAL') {
      state.mode = mode;
      io.emit('status_mode', state.mode);
    }
  });

  socket.on('command_control', (cmd) => {
    if (cmd === 'BUKA') {
      state.roof = 'MEMBUKA (TEDUH)';
      io.emit('status_atap', state.roof);
    } else if (cmd === 'TUTUP') {
      state.roof = 'MENUTUP (PERLINDUNGAN)';
      io.emit('status_atap', state.roof);
    }
  });
});

setInterval(() => {
  scenarioIndex = (scenarioIndex + 1) % weatherScenarios.length;
  const current = weatherScenarios[scenarioIndex];

  state.weather = current.weather;
  state.temp = randFloat(current.tempRange[0], current.tempRange[1]);
  state.wind = randFloat(current.windRange[0], current.windRange[1]);
  state.humidity = randInt(current.humRange[0], current.humRange[1]);
  state.uv = randInt(current.uvRange[0], current.uvRange[1]);

  if (state.mode === 'AUTO') {
    state.roof = current.roof;
  }

  io.emit('telemetri_suhu', state.temp.toFixed(1));
  io.emit('telemetri_angin', state.wind.toFixed(1));
  io.emit('telemetri_kelembapan', state.humidity);
  io.emit('telemetri_uv', state.uv);
  io.emit('status_hujan', state.weather);
  io.emit('status_atap', state.roof);
}, INTERVAL_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server SCADA berjalan di http://localhost:${PORT}`);
});
