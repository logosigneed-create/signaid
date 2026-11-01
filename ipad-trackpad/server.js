/**
 * WinPad - Serveur Node.js (Alternative moderne a Python)
 * Express + ws + koffi (FFI natif Windows user32 sans compilation C++)
 */

const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const koffi = require('koffi');

// Chargement natif ultra-rapide de user32.dll sans compilation C++
const user32 = koffi.load('user32.dll');
const mouse_event = user32.func('void mouse_event(uint32, uint32, uint32, uint32, uintptr_t)');
const SetCursorPos = user32.func('bool SetCursorPos(int, int)');
const GetSystemMetrics = user32.func('int GetSystemMetrics(int)');

try {
  const shcore = koffi.load('shcore.dll');
  const SetProcessDpiAwareness = shcore.func('int SetProcessDpiAwareness(int)');
  SetProcessDpiAwareness(2); // Per-Monitor DPI aware
} catch (e) {
  try {
    const SetProcessDPIAware = user32.func('bool SetProcessDPIAware()');
    SetProcessDPIAware();
  } catch (err) {}
}

const MOUSEEVENTF_MOVE = 0x0001;
const MOUSEEVENTF_LEFTDOWN = 0x0002;
const MOUSEEVENTF_LEFTUP = 0x0004;
const MOUSEEVENTF_RIGHTDOWN = 0x0008;
const MOUSEEVENTF_RIGHTUP = 0x0010;
const MOUSEEVENTF_MIDDLEDOWN = 0x0020;
const MOUSEEVENTF_MIDDLEUP = 0x0040;
const MOUSEEVENTF_WHEEL = 0x0800;
const MOUSEEVENTF_HWHEEL = 0x1000;

let screenWidth = GetSystemMetrics(0) || 1920;
let screenHeight = GetSystemMetrics(1) || 1080;
const buttonsDown = new Set();

function updateScreenMetrics() {
  screenWidth = GetSystemMetrics(0) || 1920;
  screenHeight = GetSystemMetrics(1) || 1080;
  return { width: screenWidth, height: screenHeight };
}

function moveRel(dx, dy) {
  const idx = Math.round(dx);
  const idy = Math.round(dy);
  if (idx !== 0 || idy !== 0) {
    mouse_event(MOUSEEVENTF_MOVE, idx, idy, 0, 0);
  }
}

function moveAbs(x, y) {
  const cx = Math.max(0, Math.min(screenWidth - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(screenHeight - 1, Math.round(y)));
  SetCursorPos(cx, cy);
}

function moveNorm(normX, normY) {
  const px = Math.round(normX * (screenWidth - 1));
  const py = Math.round(normY * (screenHeight - 1));
  moveAbs(px, py);
}

function mouseDown(btn = 'left') {
  if (btn === 'left') {
    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
    buttonsDown.add('left');
  } else if (btn === 'right') {
    mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
    buttonsDown.add('right');
  } else if (btn === 'middle') {
    mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0);
    buttonsDown.add('middle');
  }
}

function mouseUp(btn = 'left') {
  if (btn === 'left') {
    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    buttonsDown.delete('left');
  } else if (btn === 'right') {
    mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
    buttonsDown.delete('right');
  } else if (btn === 'middle') {
    mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0);
    buttonsDown.delete('middle');
  }
}

function click(btn = 'left') {
  mouseDown(btn);
  mouseUp(btn);
}

function scroll(dx, dy) {
  if (dy !== 0) {
    const wheelY = Math.round(dy * 40);
    mouse_event(MOUSEEVENTF_WHEEL, 0, 0, wheelY, 0);
  }
  if (dx !== 0) {
    const wheelX = Math.round(dx * 40);
    mouse_event(MOUSEEVENTF_HWHEEL, 0, 0, wheelX, 0);
  }
}

function pencilEvent(normX, normY, pressure, state) {
  moveNorm(normX, normY);
  if (state === 'down') {
    if (!buttonsDown.has('left')) mouseDown('left');
  } else if (state === 'up') {
    if (buttonsDown.has('left')) mouseUp('left');
  }
}

function releaseAllButtons() {
  for (const btn of Array.from(buttonsDown)) {
    mouseUp(btn);
  }
  buttonsDown.clear();
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips.length > 0 ? ips : ['127.0.0.1'];
}

// --- Serveur HTTP Express & WebSocket ---
const app = express();
const PORT = process.env.PORT || 5000;
const staticDir = path.join(__dirname, 'static');

app.use(express.static(staticDir));

app.get('/api/info', (req, res) => {
  const metrics = updateScreenMetrics();
  res.json({
    screen: metrics,
    ips: getLocalIPs(),
    status: 'ready'
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] iPad connecte (${clientIp})`);

  const metrics = updateScreenMetrics();
  ws.send(JSON.stringify({
    type: 'init',
    screenWidth: metrics.width,
    screenHeight: metrics.height,
    serverTime: Date.now()
  }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      switch (msg.type) {
        case 'move':
          moveRel(msg.dx || 0, msg.dy || 0);
          break;
        case 'move_abs':
          moveAbs(msg.x || 0, msg.y || 0);
          break;
        case 'move_norm':
          moveNorm(msg.x || 0, msg.y || 0);
          break;
        case 'click':
          click(msg.button || 'left');
          break;
        case 'double_click':
          click(msg.button || 'left');
          setTimeout(() => click(msg.button || 'left'), 40);
          break;
        case 'down':
          mouseDown(msg.button || 'left');
          break;
        case 'up':
          mouseUp(msg.button || 'left');
          break;
        case 'scroll':
          scroll(msg.dx || 0, msg.dy || 0);
          break;
        case 'pencil':
          pencilEvent(msg.x || 0, msg.y || 0, msg.pressure || 0.5, msg.state || 'move');
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', t: msg.t || 0 }));
          break;
        case 'refresh_screen':
          const m = updateScreenMetrics();
          ws.send(JSON.stringify({
            type: 'screen_update',
            screenWidth: m.width,
            screenHeight: m.height
          }));
          break;
      }
    } catch (e) {
      console.error('[WebSocket] Erreur traitement:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] iPad deconnecte (${clientIp})`);
    releaseAllButtons();
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Erreur:', err);
    releaseAllButtons();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  const primaryIp = ips[0];
  const ipadUrl = `http://${primaryIp}:${PORT}`;
  const localUrl = `http://localhost:${PORT}`;

  console.log('\n==============================================================');
  console.log(' 📱  IPAD TRACKPAD & TABLETTE POUR WINDOWS (Node.js)');
  console.log('==============================================================');
  console.log(`  ⚡ Statut     : Serveur actif et en ecoute sur le port ${PORT}`);
  console.log(`  👉 URL iPad   : \x1b[32m\x1b[1m${ipadUrl}\x1b[0m`);
  if (ips.length > 1) {
    console.log(`  🌐 Autres IPs : ${ips.slice(1).map(ip => `http://${ip}:${PORT}`).join(', ')}`);
  }
  console.log(`  💻 Localhost  : ${localUrl}`);
  console.log('--------------------------------------------------------------');
  console.log('  💡 Astuce PWA iPad :');
  console.log("     Ouvrez dans Safari, appuyez sur Partager ➔ Sur l'ecran d'accueil");
  console.log('  🛑 Pour arreter : Appuyez sur Ctrl + C');
  console.log('==============================================================\n');
});
