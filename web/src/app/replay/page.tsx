"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StatTile from "@/components/StatTile";
import { SERVER_HTTP } from "@/lib/telemetry";
import { makeBrownNoise, dbToGain } from "@/lib/noise";

/*
  Night Replay — a full simulated 8-hour night compressed into a minute:
  every posture shift, noise event, ANC response and the battery curve,
  like a flight recorder for the ear-wrap.
*/

interface Sample {
  m: number;
  clock: string;
  posture: "supine" | "left" | "right";
  ambientDb: number;
  residualDb: number;
  anc: { left: number; right: number };
  powerMw: number;
  batteryPct: number;
}
interface Night {
  startClock: string;
  endClock: string;
  minutes: number;
  segments: { start: number; end: number; posture: Sample["posture"] }[];
  events: { minute: number; kind: string; label: string; peakDb: number; clock: string }[];
  samples: Sample[];
  summary: {
    meanAmbientDb: number;
    meanResidualDb: number;
    meanAttenuationDb: number;
    noiseEvents: number;
    postureShifts: number;
    batteryUsedPct: number;
  };
}

const POSTURE_COLOR: Record<Sample["posture"], string> = {
  supine: "var(--posture-neutral)",
  left: "var(--series-3)",
  right: "var(--series-4)",
};
const POSTURE_LABEL: Record<Sample["posture"], string> = {
  supine: "on back",
  left: "left side",
  right: "right side",
};
const EVENT_ICONS: Record<string, string> = {
  horn: "🚗", snore: "😴", dog: "🐕", door: "🚪", siren: "🚨", train: "🚆",
};

const W = 900;
const H = 260;
const PAD = { l: 40, r: 16, t: 18, b: 44 };
const DB_MIN = 10;
const DB_MAX = 85;

export default function ReplayPage() {
  const [night, setNight] = useState<Night | null>(null);
  const [error, setError] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(60); // seconds for the full night
  const [hover, setHover] = useState<number | null>(null);
  const [sound, setSound] = useState<"off" | "outside" | "ear">("off");
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef(0);
  const audioRef = useRef<{
    ctx: AudioContext;
    gain: GainNode;
    filter: BiquadFilterNode;
    buf: AudioBuffer;
  } | null>(null);
  const prevIdxRef = useRef(0);

  useEffect(() => {
    fetch(`${SERVER_HTTP}/api/replay`)
      .then((r) => r.json())
      .then(setNight)
      .catch(() => setError(true));
  }, []);

  // autoplay
  useEffect(() => {
    if (!playing || !night) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCursor((c) => {
        const next = c + (night.minutes / duration) * dt;
        if (next >= night.minutes - 1) {
          setPlaying(false);
          return night.minutes - 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, night, duration]);

  // --- "hear the night" audio: a noise bed whose loudness tracks the chart ---
  const setSoundMode = (m: "off" | "outside" | "ear") => {
    if (m !== "off" && !audioRef.current) {
      const ctx = new AudioContext();
      const buf = makeBrownNoise(ctx, 3);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
      audioRef.current = { ctx, gain, filter, buf };
    }
    audioRef.current?.ctx.resume();
    setSound(m);
  };

  const blip = (kind: string, peakDb: number) => {
    const a = audioRef.current;
    if (!a) return;
    const { ctx } = a;
    const t = ctx.currentTime;
    const atEar = sound === "ear";
    const amp = dbToGain(atEar ? peakDb - 22 : peakDb + 4);
    if (kind === "horn" || kind === "siren") {
      [440, 554].forEach((f) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = atEar ? f * 0.98 : f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp * 0.5, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        const f2 = ctx.createBiquadFilter();
        f2.type = "lowpass";
        f2.frequency.value = atEar ? 500 : 4000;
        o.connect(g).connect(f2).connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.6);
      });
    } else {
      const src = ctx.createBufferSource();
      src.buffer = a.buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = kind === "snore" ? 340 : kind === "dog" ? 750 : 500;
      bp.Q.value = 1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      src.connect(bp).connect(g).connect(ctx.destination);
      src.start(t);
      src.stop(t + 0.4);
    }
  };

  useEffect(
    () => () => {
      audioRef.current?.ctx.close().catch(() => {});
    },
    [],
  );

  // follow the playhead: loudness = the chart's dB at this minute
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !night) return;
    const i = Math.min(Math.round(hover ?? cursor), night.minutes - 1);
    if (sound === "off" || !playing) {
      a.gain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.1);
      prevIdxRef.current = i;
      return;
    }
    const s = night.samples[i];
    const db = sound === "ear" ? s.residualDb : s.ambientDb;
    a.gain.gain.setTargetAtTime(dbToGain(db), a.ctx.currentTime, 0.08);
    // at the ear everything is muffled by the passive layers
    a.filter.frequency.setTargetAtTime(sound === "ear" ? 420 : 1400, a.ctx.currentTime, 0.1);
    const from = prevIdxRef.current;
    if (i > from && i - from < 30) {
      night.events
        .filter((e) => e.minute > from && e.minute <= i)
        .forEach((e) => blip(e.kind, e.peakDb));
    }
    prevIdxRef.current = i;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, hover, sound, playing, night]);

  const x = (m: number) => PAD.l + ((W - PAD.l - PAD.r) * m) / ((night?.minutes ?? 480) - 1);
  const y = (db: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - (db - DB_MIN) / (DB_MAX - DB_MIN));

  const paths = useMemo(() => {
    if (!night) return null;
    const line = (get: (s: Sample) => number) =>
      night.samples.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.m).toFixed(1)},${y(get(s)).toFixed(1)}`).join(" ");
    return { ambient: line((s) => s.ambientDb), residual: line((s) => s.residualDb) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [night]);

  if (error) {
    return (
      <div className="fade-up mx-auto max-w-3xl">
        <div className="card p-8 text-center text-sm text-ink-2">
          Could not load the night from the telemetry server. Start it with{" "}
          <code className="font-mono text-accent">npm run dev</code> at the project root.
        </div>
      </div>
    );
  }

  const idx = Math.min(Math.round(hover ?? cursor), (night?.minutes ?? 1) - 1);
  const cur = night?.samples[idx];

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !night) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const m = ((px - PAD.l) / (W - PAD.l - PAD.r)) * (night.minutes - 1);
    setHover(m >= 0 && m <= night.minutes - 1 ? m : null);
  };

  return (
    <div className="fade-up mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Night Replay</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          One full night ({night?.startClock ?? "22:30"} → {night?.endClock ?? "06:30"}) through
          the ear-wrap&apos;s flight recorder — every toss, turn, horn and snore, and how the
          adaptive controller answered.
        </p>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Mean attenuation" value={night ? night.summary.meanAttenuationDb.toFixed(1) : "—"} unit="dB" sub="ambient − residual, all night" accent="var(--accent)" />
        <StatTile label="Noise events survived" value={night ? String(night.summary.noiseEvents) : "—"} sub="horns, snores, doors, sirens" />
        <StatTile label="Posture shifts" value={night ? String(night.summary.postureShifts) : "—"} sub="each one re-tuned the ANC" />
        <StatTile label="Battery used" value={night ? night.summary.batteryUsedPct.toFixed(0) : "—"} unit="%" sub="adaptive power management" />
      </div>

      {/* main chart */}
      <section className="card p-5">
        <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: "var(--series-1)" }} /> Ambient
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: "var(--series-2)" }} /> Residual at ear
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-muted">
            <span className="size-2 rotate-45" style={{ background: "var(--status-serious)" }} /> noise event
          </span>
          <span className="ml-auto flex items-center gap-3 text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-sm" style={{ background: POSTURE_COLOR.supine }} /> back
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-sm" style={{ background: POSTURE_COLOR.left }} /> left
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-sm" style={{ background: POSTURE_COLOR.right }} /> right
            </span>
          </span>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onClick={() => hover != null && setCursor(hover)}
          role="img"
          aria-label="Night-long chart of ambient versus residual noise with posture and events"
        >
          {[20, 40, 60, 80].map((db) => (
            <g key={db}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(db)} y2={y(db)} stroke="var(--grid)" strokeWidth="1" />
              <text x={PAD.l - 6} y={y(db) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-muted)" className="tabular">{db}</text>
            </g>
          ))}

          {/* clock ticks every 2h */}
          {night &&
            [0, 120, 240, 360, 479].map((m) => (
              <text key={m} x={x(m)} y={H - PAD.b + 14} textAnchor="middle" fontSize="10" fill="var(--ink-muted)" className="tabular">
                {night.samples[m]?.clock}
              </text>
            ))}

          {paths && (
            <>
              <path d={paths.ambient} fill="none" stroke="var(--series-1)" strokeWidth="1.8" strokeLinejoin="round" />
              <path d={paths.residual} fill="none" stroke="var(--series-2)" strokeWidth="1.8" strokeLinejoin="round" />
            </>
          )}

          {/* event markers */}
          {night?.events.map((e, i) => (
            <rect
              key={i}
              x={x(e.minute) - 3}
              y={PAD.t - 6}
              width="6"
              height="6"
              transform={`rotate(45 ${x(e.minute)} ${PAD.t - 3})`}
              fill="var(--status-serious)"
              opacity="0.9"
            >
              <title>{`${e.clock} · ${e.label} (${e.peakDb} dB)`}</title>
            </rect>
          ))}

          {/* posture band */}
          {night?.segments.map((s, i) => (
            <rect
              key={i}
              x={x(s.start)}
              y={H - PAD.b + 20}
              width={Math.max(0, x(Math.min(s.end, night.minutes - 1)) - x(s.start) - 1)}
              height="10"
              rx="2"
              fill={POSTURE_COLOR[s.posture]}
              opacity="0.85"
            >
              <title>{POSTURE_LABEL[s.posture]}</title>
            </rect>
          ))}

          {/* playhead */}
          {night && (
            <g>
              <line x1={x(idx)} x2={x(idx)} y1={PAD.t - 8} y2={H - PAD.b + 30} stroke="var(--ink)" strokeWidth="1.2" opacity="0.8" />
              <circle cx={x(idx)} cy={y(cur?.ambientDb ?? 40)} r="3.5" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
              <circle cx={x(idx)} cy={y(cur?.residualDb ?? 25)} r="3.5" fill="var(--series-2)" stroke="var(--surface-1)" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* transport */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (!playing && night && cursor >= night.minutes - 2) setCursor(0);
              setPlaying((p) => !p);
            }}
            className="grid size-10 place-items-center rounded-full bg-accent text-[var(--on-accent)] transition-transform hover:scale-105"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor"><rect x="3" y="2.5" width="3.4" height="11" rx="1" /><rect x="9.6" y="2.5" width="3.4" height="11" rx="1" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor"><path d="M4.5 2.8v10.4c0 .8.9 1.3 1.6.9l8-5.2c.6-.4.6-1.4 0-1.8l-8-5.2c-.7-.4-1.6.1-1.6.9z" /></svg>
            )}
          </button>
          <input
            type="range"
            min={0}
            max={(night?.minutes ?? 480) - 1}
            step={0.5}
            value={cursor}
            onChange={(e) => setCursor(Number(e.target.value))}
            className="min-w-40 flex-1 accent-[var(--accent)]"
            aria-label="Scrub through the night"
          />
          <div className="flex gap-1 text-xs">
            {[30, 60, 120].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`rounded-full border px-2.5 py-1 transition-colors ${
                  duration === d ? "border-accent text-ink" : "border-hairline text-ink-muted hover:text-ink-2"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
          <div className="flex gap-1 text-xs" role="group" aria-label="Replay sound">
            {(
              [
                ["off", "🔇 Mute"],
                ["outside", "🌍 Outside"],
                ["ear", "👂 At the ear"],
              ] as const
            ).map(([m, labelText]) => (
              <button
                key={m}
                onClick={() => setSoundMode(m)}
                className={`rounded-full border px-2.5 py-1 transition-colors ${
                  sound === m ? "border-accent bg-[var(--accent-soft)] text-ink" : "border-hairline text-ink-muted hover:text-ink-2"
                }`}
              >
                {labelText}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          🎧 Turn the sound on and press play — then flip between what the street sounded like
          (<span className="text-ink-2">Outside</span>) and what actually reached the sleeper
          (<span className="text-ink-2">At the ear</span>). Every diamond fires its own sound.
        </p>
      </section>

      {/* moment readout */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <section className="card p-5">
          <p className="label mb-2">This moment</p>
          <p className="text-4xl font-semibold tracking-tight tabular">{cur?.clock ?? "--:--"}</p>
          <p className="mt-1 text-sm text-ink-2">
            sleeping <span className="font-medium text-ink">{cur ? POSTURE_LABEL[cur.posture] : "—"}</span>
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              ["Ambient", cur ? `${cur.ambientDb.toFixed(1)} dB` : "—"],
              ["At the ear", cur ? `${cur.residualDb.toFixed(1)} dB` : "—"],
              ["ANC L / R", cur ? `${cur.anc.left.toFixed(2)}× / ${cur.anc.right.toFixed(2)}×` : "—"],
              ["Power", cur ? `${cur.powerMw} mW` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-hairline pb-2 last:border-0">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="tabular font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* battery chart */}
        <section className="card p-5">
          <p className="label mb-2">Battery through the night</p>
          <svg viewBox={`0 0 ${W} 130`} className="w-full" role="img" aria-label="Battery percentage across the night">
            {[50, 100].map((p) => {
              const by = 14 + (130 - 14 - 24) * (1 - p / 100);
              return (
                <g key={p}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={by} y2={by} stroke="var(--grid)" strokeWidth="1" />
                  <text x={PAD.l - 6} y={by + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-muted)" className="tabular">{p}%</text>
                </g>
              );
            })}
            {night && (
              <>
                <path
                  d={night.samples
                    .map((s, i) => `${i === 0 ? "M" : "L"}${x(s.m).toFixed(1)},${(14 + (130 - 14 - 24) * (1 - s.batteryPct / 100)).toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  stroke="var(--series-1)"
                  strokeWidth="2"
                />
                <line x1={x(idx)} x2={x(idx)} y1="8" y2="118" stroke="var(--ink)" strokeWidth="1" opacity="0.6" />
                {cur && (
                  <circle
                    cx={x(idx)}
                    cy={14 + (130 - 14 - 24) * (1 - cur.batteryPct / 100)}
                    r="3.5"
                    fill="var(--series-1)"
                    stroke="var(--surface-1)"
                    strokeWidth="2"
                  />
                )}
              </>
            )}
          </svg>
          <p className="mt-1 text-xs text-ink-muted">
            {cur ? `${cur.batteryPct.toFixed(0)}% remaining` : ""} — posture-aware power
            management (Claim 13) stretches one charge across the whole night.
          </p>
        </section>
      </div>
    </div>
  );
}
