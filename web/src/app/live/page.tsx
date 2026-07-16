"use client";

import { useSharedTelemetry } from "@/components/Shell";
import PostureTwin from "@/components/PostureTwin";
import StripChart from "@/components/StripChart";
import ArcGauge from "@/components/ArcGauge";
import StatTile from "@/components/StatTile";
import { SERVER_HTTP } from "@/lib/telemetry";

const EVENT_ICONS: Record<string, string> = {
  horn: "🚗",
  snore: "😴",
  dog: "🐕",
  door: "🚪",
  siren: "🚨",
};

export default function LivePage() {
  const { frame, history, events, status, sendPosture } = useSharedTelemetry();

  const attenuation = frame
    ? frame.ambientDb - (frame.residualDb.left + frame.residualDb.right) / 2
    : 0;

  return (
    <div className="fade-up mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Live Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Digital twin of the ear-wrap — change the sleeper&apos;s posture and watch the
            adaptive controller respond in real time.
          </p>
        </div>
        {status !== "live" && (
          <p className="rounded-lg border border-critical/40 bg-[rgba(208,59,59,0.1)] px-3 py-2 text-xs text-ink-2">
            Telemetry server unreachable — run <code className="font-mono">npm run dev</code> at the
            project root to start it on port 4100.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* digital twin */}
        <section className="card p-5">
          <p className="label mb-3">Posture digital twin</p>
          <PostureTwin frame={frame} sendPosture={sendPosture} />
        </section>

        <div className="space-y-4">
          {/* headline stats */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile
              label="Attenuation now"
              value={attenuation.toFixed(1)}
              unit="dB"
              sub="passive + active combined"
              accent="var(--accent)"
            />
            <StatTile
              label="Power draw"
              value={String(frame?.powerMw ?? "—")}
              unit="mW"
              sub="range 50–500 mW"
            />
            <StatTile
              label="Battery"
              value={frame ? frame.batteryPct.toFixed(0) : "—"}
              unit="%"
              sub="6–12 h per charge"
            />
            <StatTile
              label="Loop latency"
              value={frame ? frame.latencyMs.toFixed(1) : "—"}
              unit="ms"
              sub="feedback correction loop"
            />
          </div>

          {/* live chart */}
          <section className="card p-5">
            <p className="label mb-2">Hybrid cancellation — live</p>
            <StripChart history={history} />
          </section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* per-ear gauges */}
        <section className="card p-5">
          <p className="label mb-1">Adaptive ANC gain — per ear</p>
          <p className="mb-2 text-xs text-ink-muted">
            The pillow-side ear gains passive occlusion, so the controller backs its ANC off
            and spends the power where it matters (Claim 7).
          </p>
          <div className="flex justify-center gap-2">
            <ArcGauge value={frame?.anc.left ?? 0.5} min={0.5} max={2.5} label="Left ear" unit="×" />
            <ArcGauge value={frame?.anc.right ?? 0.5} min={0.5} max={2.5} label="Right ear" unit="×" />
          </div>
        </section>

        {/* seal + pressure */}
        <section className="card p-5">
          <p className="label mb-1">Seal & cushion response</p>
          <p className="mb-3 text-xs text-ink-muted">
            Dynamic pressure compensation keeps the acoustic seal stable as the cushion deforms
            (Claims 5, 12).
          </p>
          <div className="space-y-4">
            {(["left", "right"] as const).map((side) => {
              const seal = frame?.sealPct[side] ?? 60;
              const kpa = frame?.pressureKpa[side] ?? 0.5;
              const mm = frame?.deformationMm[side] ?? 1;
              return (
                <div key={side}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-ink-2 capitalize">{side} ear</span>
                    <span className="tabular text-ink-muted">
                      seal {seal.toFixed(0)}% · {kpa.toFixed(1)} kPa · {mm.toFixed(1)} mm
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${seal}%`, background: "var(--accent)" }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-ink-muted">
              Seal efficiency range 60–95% · cushion load 0.5–10 kPa · deformation 1–15 mm
              (disclosure §21).
            </p>
          </div>
        </section>

        {/* noise events */}
        <section className="card p-5">
          <p className="label mb-3">Noise events</p>
          {events.length === 0 ? (
            <p className="text-sm text-ink-muted">Listening… transient events appear here.</p>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 5).map((e, i) => (
                <li key={e.at + i} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <span aria-hidden>{EVENT_ICONS[e.kind] ?? "🔊"}</span>
                  <span className="text-ink-2">{e.label}</span>
                  <span className="tabular ml-auto text-xs text-ink-muted">+{e.peakDb} dB · {e.band}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* hardware-ready panel */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="label">Hardware link — ESP32 ready</p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-muted">
              This dashboard is currently fed by the simulation engine. The moment the physical
              prototype POSTs a frame to the endpoint below, every panel on this page switches to
              live hardware telemetry automatically (and falls back to simulation if the device
              goes silent for 5 s).
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              frame?.mode === "hardware" ? "bg-[rgba(12,163,12,0.15)] text-good" : "bg-[var(--accent-soft)] text-accent"
            }`}
          >
            {frame?.mode === "hardware" ? "HARDWARE" : "SIMULATION"}
          </span>
        </div>
        <pre
          className="mt-3 overflow-x-auto rounded-lg p-3 font-mono text-xs leading-relaxed"
          style={{ background: "var(--code-bg)", color: "var(--code-ink)" }}
        >
{`POST ${SERVER_HTTP}/api/device/telemetry
Content-Type: application/json

{ "posture": "left", "ambientDb": 52.4,
  "anc": { "left": 0.9, "right": 2.1 },
  "pressureKpa": { "left": 6.3, "right": 0.7 },
  "batteryPct": 84, "powerMw": 210 }`}
        </pre>
      </section>
    </div>
  );
}
