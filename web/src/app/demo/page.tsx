"use client";

import { useEffect, useRef, useState } from "react";
import { makeBrownNoise } from "@/lib/noise";

/*
  ANC Audio Lab — an audible, interactive model of the invention's hybrid
  noise-control chain (disclosure §8 steps 2-5).

  Synthesized noise sources play through two switchable stages:
    · Passive layer  — high-shelf attenuation, like the multi-layer acoustic fabric
    · Active ANC     — low-shelf attenuation, like anti-phase cancellation
  so you can HEAR what each layer of the invention contributes.
  (A perceptual model for demonstration — real ANC inverts the wave itself.)
*/

type SourceKind = "traffic" | "snore";

interface Rig {
  ctx: AudioContext;
  passive: BiquadFilterNode;
  anc: BiquadFilterNode;
  master: GainNode;
  inAnalyser: AnalyserNode;
  outAnalyser: AnalyserNode;
  sources: Partial<Record<SourceKind, { stop: () => void }>>;
  srcBus: GainNode;
}

export default function DemoPage() {
  const rigRef = useRef<Rig | null>(null);
  const [powered, setPowered] = useState(false);
  const [playing, setPlaying] = useState<Record<SourceKind, boolean>>({ traffic: false, snore: false });
  const [passiveOn, setPassiveOn] = useState(false);
  const [ancOn, setAncOn] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [meterDb, setMeterDb] = useState(-60);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const powerOn = async () => {
    if (rigRef.current) return;
    const ctx = new AudioContext();
    await ctx.resume();

    const srcBus = ctx.createGain();
    srcBus.gain.value = 1;

    const inAnalyser = ctx.createAnalyser();
    inAnalyser.fftSize = 2048;

    // passive fabric: soaks up mid/high frequencies
    const passive = ctx.createBiquadFilter();
    passive.type = "highshelf";
    passive.frequency.value = 900;
    passive.gain.value = 0; // transparent until enabled

    // active ANC: destroys the low-frequency hum
    const anc = ctx.createBiquadFilter();
    anc.type = "lowshelf";
    anc.frequency.value = 700;
    anc.gain.value = 0;

    const master = ctx.createGain();
    master.gain.value = volume;

    const outAnalyser = ctx.createAnalyser();
    outAnalyser.fftSize = 2048;

    // keep the louder sources from clipping
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 10;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.2;

    srcBus.connect(inAnalyser);
    inAnalyser.connect(passive);
    passive.connect(anc);
    anc.connect(master);
    master.connect(limiter);
    limiter.connect(outAnalyser);
    outAnalyser.connect(ctx.destination);

    rigRef.current = { ctx, passive, anc, master, inAnalyser, outAnalyser, sources: {}, srcBus };
    setPowered(true);
  };

  const toggleSource = (kind: SourceKind) => {
    const rig = rigRef.current;
    if (!rig) return;
    const existing = rig.sources[kind];
    if (existing) {
      existing.stop();
      delete rig.sources[kind];
      setPlaying((p) => ({ ...p, [kind]: false }));
      return;
    }
    const { ctx, srcBus } = rig;
    const nodes: AudioNode[] = [];
    const stops: (() => void)[] = [];

    if (kind === "traffic") {
      // brown noise voiced into the mid range so laptop speakers reproduce it,
      // plus a deep rumble partial for headphone listeners
      const noise = ctx.createBufferSource();
      noise.buffer = makeBrownNoise(ctx);
      noise.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1100;
      const g = ctx.createGain();
      g.gain.value = 1.6;
      noise.connect(lp).connect(g).connect(srcBus);
      const rumble = ctx.createOscillator();
      rumble.type = "sine";
      rumble.frequency.value = 58;
      const rg = ctx.createGain();
      rg.gain.value = 0.3;
      rumble.connect(rg).connect(srcBus);
      noise.start();
      rumble.start();
      nodes.push(noise, lp, g, rumble, rg);
      stops.push(() => {
        noise.stop();
        rumble.stop();
      });
    } else {
      // snore: raspy band-passed noise, gated by a slow breathing envelope
      const noise = ctx.createBufferSource();
      noise.buffer = makeBrownNoise(ctx);
      noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 340;
      bp.Q.value = 0.9;
      const env = ctx.createGain();
      env.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.38; // breaths per second
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = i / 255;
        curve[i] = Math.pow(Math.max(0, Math.sin(x * Math.PI)), 3) * 2.6; // peaky inhale
      }
      shaper.curve = curve;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1;
      lfo.connect(shaper).connect(lfoGain).connect(env.gain);
      noise.connect(bp).connect(env).connect(srcBus);
      noise.start();
      lfo.start();
      nodes.push(noise, bp, env, lfo, shaper, lfoGain);
      stops.push(() => {
        noise.stop();
        lfo.stop();
      });
    }

    rig.sources[kind] = {
      stop: () => {
        stops.forEach((s) => s());
        nodes.forEach((n) => n.disconnect());
      },
    };
    setPlaying((p) => ({ ...p, [kind]: true }));
  };

  const playHorn = () => {
    const rig = rigRef.current;
    if (!rig) return;
    const { ctx, srcBus } = rig;
    const t = ctx.currentTime;
    [440, 554].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.03);
      g.gain.setValueAtTime(0.22, t + 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      o.connect(g).connect(srcBus);
      o.start(t);
      o.stop(t + 1.2);
    });
  };

  // stage toggles ramp the filter gains, so the change is audible but smooth
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    rig.passive.gain.setTargetAtTime(passiveOn ? -18 : 0, rig.ctx.currentTime, 0.08);
  }, [passiveOn, powered]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    rig.anc.gain.setTargetAtTime(ancOn ? -26 : 0, rig.ctx.currentTime, 0.08);
  }, [ancOn, powered]);

  useEffect(() => {
    const rig = rigRef.current;
    if (rig) rig.master.gain.setTargetAtTime(volume, rig.ctx.currentTime, 0.05);
  }, [volume]);

  // waveform scope: incoming / anti-noise / residual
  useEffect(() => {
    if (!powered) return;
    const canvas = canvasRef.current;
    const rig = rigRef.current;
    if (!canvas || !rig) return;
    const c = canvas.getContext("2d")!;
    const inData = new Float32Array(rig.inAnalyser.fftSize);
    const outData = new Float32Array(rig.outAnalyser.fftSize);

    // resolved per frame so a theme switch recolors the scope live
    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      return {
        grid: css.getPropertyValue("--grid").trim() || "#2c2c2a",
        inC: css.getPropertyValue("--series-1").trim() || "#3987e5",
        anti: css.getPropertyValue("--violet").trim() || "#9085e9",
        out: css.getPropertyValue("--series-5").trim() || "#199e70",
        ink: css.getPropertyValue("--ink-muted").trim() || "#898781",
      };
    };

    const draw = () => {
      const colors = readColors();
      const W = canvas.width;
      const H = canvas.height;
      rig.inAnalyser.getFloatTimeDomainData(inData);
      rig.outAnalyser.getFloatTimeDomainData(outData);

      // RMS meter on the residual
      let sum = 0;
      for (let i = 0; i < outData.length; i++) sum += outData[i] * outData[i];
      const rms = Math.sqrt(sum / outData.length);
      setMeterDb(Math.max(-60, Math.round(20 * Math.log10(rms + 1e-6))));

      c.clearRect(0, 0, W, H);
      const lanes = [
        { data: inData, color: colors.inC, label: "INCOMING NOISE", scale: 1, invert: false },
        { data: inData, color: colors.anti, label: `ANTI-NOISE (INVERTED)${ancOn ? "" : " — OFF"}`, scale: ancOn ? 1 : 0.04, invert: true },
        { data: outData, color: colors.out, label: "RESIDUAL AT EAR", scale: 1, invert: false },
      ];
      const laneH = H / 3;
      lanes.forEach((lane, li) => {
        const mid = laneH * li + laneH / 2;
        c.strokeStyle = colors.grid;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, mid);
        c.lineTo(W, mid);
        c.stroke();
        c.fillStyle = colors.ink;
        c.font = "10px system-ui";
        c.fillText(lane.label, 8, laneH * li + 14);
        c.strokeStyle = lane.color;
        c.lineWidth = 2;
        c.beginPath();
        const step = Math.floor(lane.data.length / W) || 1;
        for (let x = 0; x < W; x++) {
          const v = lane.data[x * step] * lane.scale * (lane.invert ? -1 : 1);
          const y = mid + v * laneH * 0.42;
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [powered, ancOn]);

  useEffect(
    () => () => {
      rigRef.current?.ctx.close().catch(() => {});
    },
    [],
  );

  const anyPlaying = playing.traffic || playing.snore;

  return (
    <div className="fade-up mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">ANC Audio Lab</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Don&apos;t read about the invention — <span className="text-ink-2">hear it</span>. Play a
          night-time noise, then switch the ear-wrap&apos;s two defense layers on and listen to what
          each one removes. Headphones recommended.
        </p>
      </div>

      {!powered ? (
        <button
          onClick={powerOn}
          className="card group flex w-full flex-col items-center gap-3 p-12 transition-colors hover:bg-surface-2"
        >
          <span className="grid size-16 place-items-center rounded-full bg-[var(--accent-soft)] text-accent transition-transform group-hover:scale-105">
            <svg viewBox="0 0 24 24" fill="none" className="size-8">
              <path d="M12 3v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M6.3 6.3a8 8 0 1 0 11.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-base font-medium">Power on the lab</span>
          <span className="text-xs text-ink-muted">starts the audio engine — nothing plays until you choose a noise</span>
        </button>
      ) : (
        <>
          {/* sources */}
          <section className="card p-5">
            <p className="label mb-3">1 · Choose the disturbance</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleSource("traffic")}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  playing.traffic ? "border-accent bg-[var(--accent-soft)] text-ink" : "border-hairline bg-surface-1 text-ink-2 hover:bg-surface-2"
                }`}
              >
                🚗 Traffic hum {playing.traffic && "· playing"}
              </button>
              <button
                onClick={() => toggleSource("snore")}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  playing.snore ? "border-accent bg-[var(--accent-soft)] text-ink" : "border-hairline bg-surface-1 text-ink-2 hover:bg-surface-2"
                }`}
              >
                😴 Snoring partner {playing.snore && "· playing"}
              </button>
              <button
                onClick={playHorn}
                className="rounded-xl border border-hairline bg-surface-1 px-4 py-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 active:border-warning"
              >
                📢 Sudden horn (tap)
              </button>
              <label className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
                Volume
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="accent-[var(--accent)]"
                />
              </label>
            </div>
          </section>

          {/* stages */}
          <section className="card p-5">
            <p className="label mb-3">2 · Engage the invention&apos;s layers</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setPassiveOn((v) => !v)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  passiveOn ? "border-violet bg-[var(--violet-soft)]" : "border-hairline bg-surface-1 hover:bg-surface-2"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Passive acoustic layers</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${passiveOn ? "bg-violet text-[var(--on-violet)]" : "bg-surface-2 text-ink-muted"}`}>
                    {passiveOn ? "ON" : "OFF"}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  Multi-layer fabric + viscoelastic foam + gel membrane. Soaks up the hiss and
                  rasp (mid/high frequencies). Zero power.
                </span>
              </button>
              <button
                onClick={() => setAncOn((v) => !v)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  ancOn ? "border-accent bg-[var(--accent-soft)]" : "border-hairline bg-surface-1 hover:bg-surface-2"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Active noise cancellation</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ancOn ? "bg-accent text-[var(--on-accent)]" : "bg-surface-2 text-ink-muted"}`}>
                    {ancOn ? "ON" : "OFF"}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  Microphones sample the noise; speakers emit the anti-phase wave. Kills the deep
                  hum passive materials can&apos;t reach.
                </span>
              </button>
            </div>
            {!anyPlaying && (
              <p className="mt-3 text-xs text-ink-2">⚠️ Start a noise source above to hear the layers work.</p>
            )}
          </section>

          {/* scope */}
          <section className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="label">3 · Watch the physics</p>
              <p className="tabular text-xs text-ink-muted">
                residual level <span className="font-semibold text-ink">{meterDb} dBFS</span>
              </p>
            </div>
            <canvas
              ref={canvasRef}
              width={800}
              height={280}
              className="w-full rounded-lg"
              style={{ background: "var(--scope-bg)" }}
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Top: what the world throws at you. Middle: the wrap&apos;s generated anti-noise —
              a mirror image, 180° out of phase (flat while ANC is off). Bottom: what actually
              reaches your eardrum. This demo reshapes audible frequencies to model the effect
              perceptually; the physical device performs true wave-front inversion (§8, step 4).
            </p>
          </section>
        </>
      )}
    </div>
  );
}
