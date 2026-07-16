// Generates a deterministic, realistic 8-hour "night" for the flight-recorder
// replay view: one sample per simulated minute (480 samples), plus a list of
// discrete noise events and posture segments.

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function generateNight(seed = 20260716) {
  const rnd = mulberry32(seed);
  const minutes = 480; // 22:30 -> 06:30
  const startHour = 22.5;

  // --- posture segments: sleepers shift ~10-14 times a night ---
  const postures = ['supine', 'left', 'right'];
  const segments = [];
  let cursor = 0;
  let current = 'left';
  while (cursor < minutes) {
    const len = Math.round(20 + rnd() * 55);
    segments.push({ start: cursor, end: Math.min(cursor + len, minutes), posture: current });
    cursor += len;
    const others = postures.filter((p) => p !== current);
    current = others[Math.floor(rnd() * others.length)];
  }

  // --- noise events across the night ---
  const eventSpecs = [
    { kind: 'horn',  label: 'Vehicle horn',  peakDb: 78 },
    { kind: 'snore', label: 'Partner snore', peakDb: 62 },
    { kind: 'dog',   label: 'Dog bark',      peakDb: 66 },
    { kind: 'door',  label: 'Door slam',     peakDb: 70 },
    { kind: 'siren', label: 'Distant siren', peakDb: 58 },
    { kind: 'train', label: 'Freight train', peakDb: 64 },
  ];
  const events = [];
  let em = 6 + Math.floor(rnd() * 18);
  while (em < minutes - 5) {
    const spec = eventSpecs[Math.floor(rnd() * eventSpecs.length)];
    events.push({ minute: em, ...spec });
    em += 10 + Math.floor(rnd() * 45);
  }
  // snoring cluster in the deep of night (partner asleep 01:00-03:00)
  for (let m = 150; m < 270; m += 8 + Math.floor(rnd() * 10)) {
    events.push({ minute: m, kind: 'snore', label: 'Partner snore', peakDb: 58 + Math.round(rnd() * 8) });
  }
  events.sort((a, b) => a.minute - b.minute);

  const postureAt = (m) => segments.find((s) => m >= s.start && m < s.end)?.posture ?? 'supine';

  // --- per-minute samples ---
  const samples = [];
  let battery = 100;
  for (let m = 0; m < minutes; m++) {
    const hour = (startHour + m / 60) % 24;
    // traffic decays into the small hours, returns before dawn
    const trafficCurve =
      hour > 22 || hour < 1 ? 8 : hour < 4 ? 2 : hour < 6 ? 5 : 10;
    let ambient = 38 + trafficCurve + 2.5 * Math.sin(m / 17) + rnd() * 2;

    const evt = events.find((e) => Math.abs(e.minute - m) < 2);
    if (evt) ambient = Math.max(ambient, evt.peakDb - Math.abs(evt.minute - m) * 8);

    const posture = postureAt(m);
    const pillowSide = posture === 'left' ? 'left' : posture === 'right' ? 'right' : null;
    const drive = clamp((ambient - 35) / 45, 0, 1);
    const ancL = clamp(0.5 + drive * 2 * (pillowSide === 'left' ? 0.45 : 1), 0.5, 2.5);
    const ancR = clamp(0.5 + drive * 2 * (pillowSide === 'right' ? 0.45 : 1), 0.5, 2.5);
    const passive = 12 + (pillowSide ? 6 : 0);
    const residual = clamp(ambient - passive - ((ancL + ancR) / 2) * 9, 12, 95);
    const powerMw = clamp(50 + (ancL + ancR - 1) * 110 + drive * 60, 50, 500);
    battery = clamp(battery - powerMw / 3200, 8, 100);

    samples.push({
      m,
      clock: minuteToClock(startHour, m),
      posture,
      ambientDb: Math.round(ambient * 10) / 10,
      residualDb: Math.round(residual * 10) / 10,
      anc: { left: Math.round(ancL * 100) / 100, right: Math.round(ancR * 100) / 100 },
      powerMw: Math.round(powerMw),
      batteryPct: Math.round(battery * 10) / 10,
    });
  }

  return {
    seed,
    startClock: minuteToClock(startHour, 0),
    endClock: minuteToClock(startHour, minutes),
    minutes,
    segments: segments.map((s) => ({ ...s, startClock: minuteToClock(startHour, s.start) })),
    events: events.map((e) => ({ ...e, clock: minuteToClock(startHour, e.minute) })),
    samples,
    summary: summarize(samples, events, segments),
  };
}

function minuteToClock(startHour, m) {
  const total = (startHour * 60 + m) % 1440;
  const h = Math.floor(total / 60);
  const min = Math.round(total % 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function summarize(samples, events, segments) {
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const meanAmbient = avg(samples.map((s) => s.ambientDb));
  const meanResidual = avg(samples.map((s) => s.residualDb));
  return {
    meanAmbientDb: Math.round(meanAmbient * 10) / 10,
    meanResidualDb: Math.round(meanResidual * 10) / 10,
    meanAttenuationDb: Math.round((meanAmbient - meanResidual) * 10) / 10,
    noiseEvents: events.length,
    postureShifts: segments.length - 1,
    batteryUsedPct: Math.round((100 - samples[samples.length - 1].batteryPct) * 10) / 10,
  };
}
