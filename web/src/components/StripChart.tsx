"use client";

import { useMemo, useRef, useState } from "react";
import type { TelemetryFrame } from "@/lib/telemetry";

const W = 640;
const H = 220;
const PAD = { l: 34, r: 74, t: 12, b: 22 };
const DB_MIN = 10;
const DB_MAX = 90;

// Live scrolling comparison: ambient noise vs residual at the ear.
// Two series → series-1 / series-2, direct-labeled at the line ends + legend.
export default function StripChart({ history }: { history: TelemetryFrame[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const frames = history;
  const n = frames.length;

  const x = (i: number) => PAD.l + ((W - PAD.l - PAD.r) * i) / Math.max(1, n - 1);
  const y = (db: number) =>
    PAD.t + (H - PAD.t - PAD.b) * (1 - (db - DB_MIN) / (DB_MAX - DB_MIN));

  const paths = useMemo(() => {
    if (n < 2) return null;
    const line = (get: (f: TelemetryFrame) => number) =>
      frames.map((f, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(get(f)).toFixed(1)}`).join(" ");
    return {
      ambient: line((f) => f.ambientDb),
      residual: line((f) => (f.residualDb.left + f.residualDb.right) / 2),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, n, frames[n - 1]?.ts]);

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n < 2) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  const hoverFrame = hover != null ? frames[hover] : null;
  const last = frames[n - 1];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: "var(--series-1)" }} />
          Ambient noise
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: "var(--series-2)" }} />
          Residual at ear
        </span>
        <span className="ml-auto text-ink-muted">last 60 s · dB</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Live chart of ambient noise versus residual noise at the ear"
      >
        {/* grid */}
        {[20, 40, 60, 80].map((db) => (
          <g key={db}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(db)} y2={y(db)} stroke="var(--grid)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(db) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-muted)" className="tabular">
              {db}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(DB_MIN)} y2={y(DB_MIN)} stroke="var(--baseline)" strokeWidth="1" />

        {paths && (
          <>
            {/* attenuation wash between the curves */}
            <path
              d={`${paths.ambient} ${frames
                .map((f, i) => `L${x(n - 1 - i).toFixed(1)},${y((frames[n - 1 - i].residualDb.left + frames[n - 1 - i].residualDb.right) / 2).toFixed(1)}`)
                .join(" ")} Z`}
              fill="var(--accent)"
              opacity="0.07"
            />
            <path d={paths.ambient} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />
            <path d={paths.residual} fill="none" stroke="var(--series-2)" strokeWidth="2" strokeLinejoin="round" />
          </>
        )}

        {/* direct labels at line ends */}
        {last && (
          <>
            <text x={W - PAD.r + 6} y={y(last.ambientDb) + 3.5} fontSize="10.5" fill="var(--ink-2)" className="tabular">
              {last.ambientDb.toFixed(0)} ambient
            </text>
            <text
              x={W - PAD.r + 6}
              y={y((last.residualDb.left + last.residualDb.right) / 2) + 3.5}
              fontSize="10.5"
              fill="var(--ink-2)"
              className="tabular"
            >
              {((last.residualDb.left + last.residualDb.right) / 2).toFixed(0)} residual
            </text>
          </>
        )}

        {/* crosshair + tooltip */}
        {hoverFrame && hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink-muted)" strokeWidth="1" strokeDasharray="3 3" />
            {[
              { v: hoverFrame.ambientDb, c: "var(--series-1)" },
              { v: (hoverFrame.residualDb.left + hoverFrame.residualDb.right) / 2, c: "var(--series-2)" },
            ].map((p, i) => (
              <circle key={i} cx={x(hover)} cy={y(p.v)} r="3.5" fill={p.c} stroke="var(--surface-1)" strokeWidth="2" />
            ))}
            <g transform={`translate(${Math.min(x(hover) + 10, W - 150)}, ${PAD.t + 6})`}>
              <rect width="140" height="52" rx="8" fill="var(--surface-2)" stroke="var(--hairline)" />
              <text x="10" y="17" fontSize="10" fill="var(--ink-muted)">
                t = {hoverFrame.t.toFixed(1)} s · {hoverFrame.posture}
              </text>
              <text x="10" y="32" fontSize="11" fill="var(--ink)" className="tabular">
                ambient {hoverFrame.ambientDb.toFixed(1)} dB
              </text>
              <text x="10" y="46" fontSize="11" fill="var(--ink)" className="tabular">
                residual {((hoverFrame.residualDb.left + hoverFrame.residualDb.right) / 2).toFixed(1)} dB
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
