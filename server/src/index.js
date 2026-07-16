import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { DeviceEngine } from './engine.js';
import { generateNight } from './replay.js';

const PORT = process.env.PORT || 4100;

const app = express();
app.use(cors());
app.use(express.json());

const engine = new DeviceEngine();
engine.start(5); // 5 Hz broadcast

// ---------- REST ----------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: engine.mode, uptimeS: Math.round(engine.t) });
});

// Hardware-ready ingestion: the real ESP32 prototype POSTs frames here and the
// dashboard switches from simulated to live telemetry automatically.
// Expected body (any subset): { posture, ambientDb, anc:{left,right},
//   pressureKpa:{left,right}, sealPct:{left,right}, powerMw, batteryPct }
app.post('/api/device/telemetry', (req, res) => {
  engine.ingestHardware(req.body ?? {});
  res.json({ ok: true, mode: 'hardware' });
});

// Digital-twin control: dashboard drags the sleeper into a posture.
app.post('/api/sim/posture', (req, res) => {
  const { posture, pinned } = req.body ?? {};
  if (posture === 'auto') {
    engine.releasePosture();
  } else {
    engine.setPosture(posture, pinned !== false);
  }
  res.json({ ok: true, posture: engine.posture, pinned: engine.posturePinned });
});

// Flight-recorder night (deterministic; pass ?seed= for a different night).
app.get('/api/replay', (req, res) => {
  const seed = Number(req.query.seed) || 20260716;
  res.json(generateNight(seed));
});

// ---------- WebSocket ----------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'hello', data: { mode: engine.mode } }));
  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'posture') {
        if (msg.posture === 'auto') engine.releasePosture();
        else engine.setPosture(msg.posture, true);
      }
    } catch {
      // ignore malformed frames
    }
  });
});

engine.onTick((frame) => {
  const payload = JSON.stringify({ type: 'telemetry', data: frame });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
});

engine.onEvent((evt) => {
  const payload = JSON.stringify({ type: 'noise-event', data: evt });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
});

server.listen(PORT, () => {
  console.log(`[anc-sim-server] listening on http://localhost:${PORT}  (ws: /ws)`);
});
