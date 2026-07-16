"use client";

import { useEffect, useRef, useState } from "react";
import type { Posture, TelemetryFrame } from "@/lib/telemetry";

const ROTATION: Record<Posture, number> = { supine: 0, left: -90, right: 90 };

// Digital twin of the sleeper. Drag the posture with the buttons (or your
// phone's tilt) and the simulation engine adapts ANC asymmetrically — exactly
// the behavior claimed in the disclosure (§8 step 6).
export default function PostureTwin({
  frame,
  sendPosture,
}: {
  frame: TelemetryFrame | null;
  sendPosture: (p: Posture | "auto") => void;
}) {
  const posture = frame?.posture ?? "supine";
  const pinned = frame?.posturePinned ?? false;
  const [tilt, setTilt] = useState(false);
  const lastSent = useRef<Posture | null>(null);

  // Device-tilt mode: physically tilt your phone like a head on a pillow.
  useEffect(() => {
    if (!tilt) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const g = e.gamma ?? 0;
      const p: Posture = g < -28 ? "left" : g > 28 ? "right" : "supine";
      if (p !== lastSent.current) {
        lastSent.current = p;
        sendPosture(p);
      }
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [tilt, sendPosture]);

  const enableTilt = async () => {
    type PermissionRequester = { requestPermission?: () => Promise<string> };
    const D = DeviceOrientationEvent as unknown as PermissionRequester;
    if (typeof D.requestPermission === "function") {
      try {
        if ((await D.requestPermission()) !== "granted") return;
      } catch {
        return;
      }
    }
    setTilt(true);
  };

  const ancL = frame?.anc.left ?? 0.5;
  const ancR = frame?.anc.right ?? 0.5;
  const pressL = frame?.pressureKpa.left ?? 0.8;
  const pressR = frame?.pressureKpa.right ?? 0.8;

  const wrapOpacity = (g: number) => 0.25 + ((g - 0.5) / 2) * 0.75;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 240 250" className="w-full max-w-[330px]" role="img" aria-label={`Sleeper lying ${posture === "supine" ? "on their back" : "on the " + posture + " side"}`}>
        {/* z z z */}
        <g fill="var(--violet)" opacity="0.8" fontWeight="600">
          <text x="176" y="42" fontSize="20">z</text>
          <text x="192" y="28" fontSize="15" opacity="0.7">z</text>
          <text x="204" y="17" fontSize="11" opacity="0.5">z</text>
        </g>

        {/* pillow */}
        <rect x="24" y="178" width="192" height="52" rx="24" fill="var(--surface-2)" stroke="var(--hairline)" />
        <path d="M44 204q76 -14 152 0" stroke="var(--baseline)" strokeWidth="1.5" fill="none" />

        {/* pressure blooms where the head loads the pillow */}
        {posture === "left" && (
          <ellipse cx="82" cy="186" rx="34" ry="12" fill="var(--series-1)" opacity={0.1 + (pressL / 10) * 0.4} />
        )}
        {posture === "right" && (
          <ellipse cx="158" cy="186" rx="34" ry="12" fill="var(--series-1)" opacity={0.1 + (pressR / 10) * 0.4} />
        )}

        {/* head — rotates with posture */}
        <g
          style={{
            transform: `rotate(${ROTATION[posture]}deg)`,
            transformOrigin: "120px 128px",
            transition: "transform 0.9s cubic-bezier(0.45, 0, 0.2, 1)",
          }}
        >
          {/* ears + wraps (glow tracks ANC gain per ear) */}
          <g>
            <circle cx="63" cy="128" r="17" fill="none" stroke="var(--accent)" strokeWidth="5" opacity={wrapOpacity(ancL)} />
            <circle cx="63" cy="128" r="9" fill="var(--surface-2)" stroke="var(--ink-muted)" strokeWidth="1.5" />
            <circle cx="177" cy="128" r="17" fill="none" stroke="var(--accent)" strokeWidth="5" opacity={wrapOpacity(ancR)} />
            <circle cx="177" cy="128" r="9" fill="var(--surface-2)" stroke="var(--ink-muted)" strokeWidth="1.5" />
          </g>
          {/* face */}
          <circle cx="120" cy="128" r="52" fill="var(--surface-2)" stroke="var(--ink-muted)" strokeWidth="1.5" />
          {/* hair */}
          <path d="M74 110a52 52 0 0 1 92 0q-10 -14 -46 -14t-46 14z" fill="var(--baseline)" />
          {/* sleeping eyes */}
          <path d="M98 130q6 5 12 0" stroke="var(--ink-2)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M130 130q6 5 12 0" stroke="var(--ink-2)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* mouth */}
          <path d="M114 152q6 4 12 0" stroke="var(--ink-muted)" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* headband hint over crown */}
          <path d="M63 111 A 58 58 0 0 1 177 111" stroke="var(--accent)" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round" />
        </g>
      </svg>

      {/* per-ear ANC/pressure readout */}
      <div className="grid w-full grid-cols-2 gap-2 text-center text-[11px] text-ink-muted">
        <div className="rounded-lg bg-surface-2 px-2 py-1.5">
          L · ANC <span className="tabular font-semibold text-ink">{ancL.toFixed(2)}×</span> ·{" "}
          <span className="tabular">{pressL.toFixed(1)} kPa</span>
        </div>
        <div className="rounded-lg bg-surface-2 px-2 py-1.5">
          R · ANC <span className="tabular font-semibold text-ink">{ancR.toFixed(2)}×</span> ·{" "}
          <span className="tabular">{pressR.toFixed(1)} kPa</span>
        </div>
      </div>

      {/* posture controls */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {(
          [
            ["left", "Left side"],
            ["supine", "On back"],
            ["right", "Right side"],
          ] as [Posture, string][]
        ).map(([p, labelText]) => (
          <button
            key={p}
            onClick={() => sendPosture(p)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              posture === p && pinned
                ? "border-accent bg-[var(--accent-soft)] text-ink"
                : "border-hairline bg-surface-1 text-ink-2 hover:bg-surface-2"
            }`}
          >
            {labelText}
          </button>
        ))}
        <button
          onClick={() => sendPosture("auto")}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            !pinned
              ? "border-violet bg-[var(--violet-soft)] text-ink"
              : "border-hairline bg-surface-1 text-ink-2 hover:bg-surface-2"
          }`}
          title="Let the simulated sleeper toss and turn on their own"
        >
          Auto
        </button>
        <button
          onClick={() => (tilt ? setTilt(false) : enableTilt())}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            tilt
              ? "border-good bg-[rgba(12,163,12,0.12)] text-ink"
              : "border-hairline bg-surface-1 text-ink-2 hover:bg-surface-2"
          }`}
          title="On a phone: tilt the device left/right to change the sleeper's posture"
        >
          {tilt ? "Tilt: on" : "Use device tilt"}
        </button>
      </div>
    </div>
  );
}
