// Device simulation engine for the ANC Sleep Ear-Wrap.
// Models the closed loop described in the invention disclosure (§8, §14):
// noise environment -> posture -> pressure -> adaptive ANC controller -> power.
// All parameter ranges follow the disclosure's §21 parameter table.

const POSTURES = ['supine', 'left', 'right'];

const NOISE_EVENTS = [
  { kind: 'horn',   label: 'Vehicle horn',   band: 'high', peakDb: 38, durMs: 1800 },
  { kind: 'snore',  label: 'Partner snore',  band: 'mid',  peakDb: 24, durMs: 2600 },
  { kind: 'dog',    label: 'Dog bark',       band: 'mid',  peakDb: 28, durMs: 1400 },
  { kind: 'door',   label: 'Door slam',      band: 'high', peakDb: 32, durMs: 900 },
  { kind: 'siren',  label: 'Distant siren',  band: 'low',  peakDb: 20, durMs: 6000 },
];

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export class DeviceEngine {
  constructor() {
    this.t = 0;                    // engine time, seconds
    this.posture = 'supine';
    this.posturePinned = false;    // true when the dashboard twin drives posture
    this.nextPostureShift = 25;
    this.baseNoiseDb = 44;         // ambient traffic hum floor
    this.activeEvent = null;
    this.nextEventAt = 8;
    this.battery = 100;            // percent
    this.mode = 'simulation';      // 'simulation' | 'hardware'
    this.lastHardwareAt = 0;
    this.hardwareFrame = null;
    this.listeners = new Set();
    this.eventListeners = new Set();
  }

  onTick(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onEvent(fn) { this.eventListeners.add(fn); return () => this.eventListeners.delete(fn); }

  setPosture(p, pinned = true) {
    if (POSTURES.includes(p)) {
      this.posture = p;
      this.posturePinned = pinned;
    }
  }

  releasePosture() { this.posturePinned = false; }

  // Real prototype pushes frames here; simulation yields until it goes quiet.
  ingestHardware(frame) {
    this.mode = 'hardware';
    this.lastHardwareAt = Date.now();
    this.hardwareFrame = frame;
  }

  start(hz = 5) {
    const stepMs = 1000 / hz;
    this.timer = setInterval(() => this.tick(stepMs / 1000), stepMs);
  }

  stop() { clearInterval(this.timer); }

  tick(dt) {
    this.t += dt;

    if (this.mode === 'hardware' && Date.now() - this.lastHardwareAt > 5000) {
      this.mode = 'simulation'; // prototype went silent; fall back
    }

    const frame = this.mode === 'hardware' && this.hardwareFrame
      ? { ...this.simulate(dt), ...this.hardwareFrame, mode: 'hardware' }
      : { ...this.simulate(dt), mode: 'simulation' };

    for (const fn of this.listeners) fn(frame);
  }

  simulate(dt) {
    // --- posture drift (unless dashboard has pinned it) ---
    if (!this.posturePinned && this.t >= this.nextPostureShift) {
      const others = POSTURES.filter((p) => p !== this.posture);
      this.posture = others[Math.floor(Math.random() * others.length)];
      this.nextPostureShift = this.t + 20 + Math.random() * 40;
    }

    // --- ambient noise: slow-breathing traffic hum + transient events ---
    const hum = this.baseNoiseDb + 3 * Math.sin(this.t / 9) + 1.5 * Math.sin(this.t / 2.7);
    if (!this.activeEvent && this.t >= this.nextEventAt) {
      const spec = NOISE_EVENTS[Math.floor(Math.random() * NOISE_EVENTS.length)];
      this.activeEvent = { ...spec, startT: this.t };
      this.nextEventAt = this.t + 10 + Math.random() * 25;
      for (const fn of this.eventListeners) fn({ kind: spec.kind, label: spec.label, band: spec.band, peakDb: spec.peakDb });
    }
    let eventDb = 0;
    let eventKind = null;
    if (this.activeEvent) {
      const el = (this.t - this.activeEvent.startT) * 1000;
      if (el > this.activeEvent.durMs) {
        this.activeEvent = null;
      } else {
        // fast attack, exponential decay envelope
        const x = el / this.activeEvent.durMs;
        const env = x < 0.12 ? x / 0.12 : Math.exp(-3.2 * (x - 0.12));
        eventDb = this.activeEvent.peakDb * env;
        eventKind = this.activeEvent.kind;
      }
    }
    const ambientDb = clamp(hum + eventDb, 30, 95);

    // --- pressure model (§21: 0.5–10 kPa on the pillow-side cushion) ---
    const pillowSide = this.posture === 'left' ? 'left' : this.posture === 'right' ? 'right' : null;
    const wobble = 0.4 * Math.sin(this.t / 5);
    const pressure = {
      left:  clamp((pillowSide === 'left'  ? 6.2 : 0.8) + wobble, 0.5, 10),
      right: clamp((pillowSide === 'right' ? 6.2 : 0.8) - wobble, 0.5, 10),
    };
    // cushion deformation 1–15 mm, proportional to load
    const deformation = {
      left:  clamp(pressure.left * 1.4, 1, 15),
      right: clamp(pressure.right * 1.4, 1, 15),
    };

    // --- adaptive ANC controller (§8 step 6: asymmetric, posture-aware) ---
    // Pillow-side ear gains passive occlusion, so ANC backs off there (power save);
    // exposed ear compensates. Gain factor range 0.5–2.5 per §21.
    const noiseDrive = clamp((ambientDb - 35) / 45, 0, 1); // 0..1 demand
    const anc = {
      left:  clamp(0.5 + noiseDrive * 2 * (pillowSide === 'left'  ? 0.45 : 1), 0.5, 2.5),
      right: clamp(0.5 + noiseDrive * 2 * (pillowSide === 'right' ? 0.45 : 1), 0.5, 2.5),
    };

    // --- resulting attenuation & seal ---
    const passiveDb = 12 + (pillowSide ? 6 : 0); // pillow adds occlusion on one side
    const seal = {
      left:  clamp(72 + (pillowSide === 'left'  ? 18 : 0) + 2 * Math.sin(this.t / 7), 60, 95),
      right: clamp(72 + (pillowSide === 'right' ? 18 : 0) - 2 * Math.sin(this.t / 7), 60, 95),
    };
    const activeDb = {
      left:  anc.left * 9,
      right: anc.right * 9,
    };
    const residualDb = {
      left:  clamp(ambientDb - passiveDb - activeDb.left, 12, 95),
      right: clamp(ambientDb - passiveDb - activeDb.right, 12, 95),
    };

    // --- power model (§21: 50–500 mW) ---
    const powerMw = clamp(50 + (anc.left + anc.right - 1) * 110 + noiseDrive * 60, 50, 500);
    this.battery = clamp(this.battery - (powerMw / 320) * (dt / 36), 0, 100);
    if (this.battery <= 0.5) this.battery = 100; // demo loop: recharge

    // --- feedback loop latency (§21: 1–20 ms) ---
    const latencyMs = clamp(3 + noiseDrive * 9 + (eventKind ? 4 : 0), 1, 20);

    return {
      ts: Date.now(),
      t: Math.round(this.t * 10) / 10,
      posture: this.posture,
      posturePinned: this.posturePinned,
      ambientDb: round1(ambientDb),
      eventKind,
      anc: { left: round2(anc.left), right: round2(anc.right) },
      residualDb: { left: round1(residualDb.left), right: round1(residualDb.right) },
      passiveDb: round1(passiveDb),
      pressureKpa: { left: round2(pressure.left), right: round2(pressure.right) },
      deformationMm: { left: round1(deformation.left), right: round1(deformation.right) },
      sealPct: { left: round1(seal.left), right: round1(seal.right) },
      powerMw: Math.round(powerMw),
      batteryPct: round1(this.battery),
      latencyMs: round1(latencyMs),
    };
  }
}

function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }
