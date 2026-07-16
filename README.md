# SomnoShield — ANC Sleep Ear-Wrap Dashboard

Interactive dashboard and demonstration site for the **Posture-Adaptive Hybrid Acoustic
Sleep Ear-Wrap System with Dynamic Pressure Compensation and Modular Active Noise
Control** (inventive disclosure, VIT Chennai).

> **CONFIDENTIAL** — this project presents material from an unfiled patent disclosure.
> Keep deployments local or access-controlled until the application is filed; public
> disclosure before filing can destroy novelty.

## What's inside

| Piece | Stack | Purpose |
|---|---|---|
| `web/` | Next.js 16 + Tailwind 4 | The dashboard UI |
| `server/` | Express + ws | Device **simulation engine**, WebSocket telemetry (5 Hz), hardware-ready ingest API, night-replay generator |

### The four instruments

- **Live Dashboard** (`/live`) — digital twin of the sleeper; change posture (buttons or
  phone tilt) and watch per-ear ANC gain, pressure, seal and power adapt in real time.
- **ANC Audio Lab** (`/demo`) — *hear* the invention: synthesized traffic/snoring noise,
  toggle the passive layer and active ANC, watch incoming / anti-phase / residual waves.
- **Claims Explorer** (`/claims`) — all 15 proposed claims mapped element-by-element onto
  an interactive device cross-section.
- **Night Replay** (`/replay`) — a simulated 8-hour night compressed to 60 seconds:
  posture shifts, noise events, ANC response, battery curve.

## Run it

```bash
npm install          # root: concurrently
npm --prefix server install
npm --prefix web install
npm run dev          # starts server (:4100) + web (:3000)
```

## Connect the real prototype

The dashboard is hardware-ready. An ESP32 (or anything) that POSTs frames switches every
panel from simulation to live telemetry automatically (falls back after 5 s of silence):

```
POST http://<host>:4100/api/device/telemetry
{ "posture": "left", "ambientDb": 52.4, "anc": { "left": 0.9, "right": 2.1 },
  "pressureKpa": { "left": 6.3, "right": 0.7 }, "batteryPct": 84, "powerMw": 210 }
```
