// Shared Web Audio helpers for the demo pages.

export function makeBrownNoise(ctx: AudioContext, seconds = 4) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

// Map a simulated environmental dB level to a playback gain.
// ~85 dB → near full scale, ~20 dB → almost silent.
export function dbToGain(db: number) {
  return Math.min(0.9, Math.pow(10, (db - 88) / 30));
}
