"use client";

import { useState } from "react";

/*
  Claims Explorer — every element of independent Claim 1 is wired to the part
  of the device that embodies it. Hover a claim element to light up the
  hardware; hover the hardware to find its claim.
*/

type PartId =
  | "wrap"
  | "extmic"
  | "speaker"
  | "intmic"
  | "control"
  | "passive"
  | "imu"
  | "cushion"
  | "psensor"
  | "battery";

interface ClaimElement {
  id: string;
  text: string;
  parts: PartId[];
}

const CLAIM1: ClaimElement[] = [
  { id: "a", text: "at least one flexible ear-wrap structure configured to enclose or partially cover a user's ear", parts: ["wrap"] },
  { id: "b", text: "one or more external microphones configured to capture ambient noise signals", parts: ["extmic"] },
  { id: "c", text: "one or more internal speakers configured to generate anti-noise signals", parts: ["speaker"] },
  { id: "d", text: "a control unit operatively connected to the microphones and speakers, configured to process captured noise and generate anti-noise via an ANC mechanism", parts: ["control", "battery"] },
  { id: "e", text: "a passive acoustic attenuation layer integrated within the ear-wrap structure", parts: ["passive"] },
  { id: "f", text: "one or more posture detection sensors configured to detect the orientation or sleeping posture of the user", parts: ["imu"] },
  { id: "g", text: "a dynamic pressure compensation module configured to adapt the structural response of the ear-wrap based on applied pressure", parts: ["cushion", "psensor"] },
  { id: "h", text: "wherein the control unit dynamically adjusts noise-cancellation parameters, acoustic output distribution, and system responsiveness based on detected posture and pressure conditions", parts: ["control", "imu", "psensor", "speaker"] },
];

const DEPENDENT: { n: number; text: string; parts: PartId[]; group: string }[] = [
  { n: 2, text: "Posture sensors comprise an accelerometer, gyroscope, or IMU for head orientation and movement.", parts: ["imu"], group: "Sensing" },
  { n: 9, text: "Microphones adapt sensitivity levels based on proximity to a noise source.", parts: ["extmic"], group: "Sensing" },
  { n: 12, text: "Pressure compensation module includes pressure sensors to detect localized force and adjust acoustic sealing.", parts: ["psensor", "cushion"], group: "Sensing" },
  { n: 3, text: "Control unit implements adaptive filtering algorithms for real-time anti-noise adjustment.", parts: ["control"], group: "Adaptive control" },
  { n: 7, text: "ANC intensity is adjusted asymmetrically based on detected sleeping posture.", parts: ["control", "speaker", "imu"], group: "Adaptive control" },
  { n: 8, text: "System differentiates stationary vs non-stationary noise and applies distinct cancellation strategies.", parts: ["control"], group: "Adaptive control" },
  { n: 11, text: "Control unit performs frequency decomposition of incoming noise for targeted cancellation.", parts: ["control"], group: "Adaptive control" },
  { n: 13, text: "Power consumption is optimized by adjusting processing intensity to ambient noise levels.", parts: ["control", "battery"], group: "Adaptive control" },
  { n: 14, text: "Real-time feedback-loop optimization minimizes latency in anti-noise generation.", parts: ["control", "intmic"], group: "Adaptive control" },
  { n: 4, text: "Passive layer comprises multi-density cushioning materials attenuating mid/high-frequency noise.", parts: ["passive"], group: "Structure" },
  { n: 5, text: "Pressure module comprises deformable cushioning structures redistributing pillow pressure.", parts: ["cushion"], group: "Structure" },
  { n: 10, text: "Modular design allows independent control of multiple acoustic zones.", parts: ["wrap", "control"], group: "Structure" },
  { n: 15, text: "Ergonomically designed to maintain comfort during prolonged usage, including side-sleeping conditions.", parts: ["wrap", "cushion"], group: "Structure" },
  { n: 6, text: "Internal feedback microphones detect residual noise near the ear and refine cancellation.", parts: ["intmic"], group: "Feedback" },
];

const PART_LABELS: Record<PartId, string> = {
  wrap: "Flexible ear-wrap (outer fabric)",
  extmic: "External microphone",
  speaker: "Anti-noise speaker",
  intmic: "Internal feedback microphone",
  control: "Detachable control module (DSP + MCU)",
  passive: "Passive acoustic attenuation layer",
  imu: "Posture sensor (IMU)",
  cushion: "Pressure-adaptive cushioning",
  psensor: "Thin-film pressure sensor",
  battery: "Rechargeable battery",
};

export default function ClaimsPage() {
  const [active, setActive] = useState<Set<PartId> | null>(null);
  const [hoverPart, setHoverPart] = useState<PartId | null>(null);

  const isLit = (p: PartId) => (active ? active.has(p) : hoverPart === p);
  const dimmed = active !== null || hoverPart !== null;

  const partStyle = (p: PartId, base: string, lit: string) => ({
    transition: "all 0.2s ease",
    ...(isLit(p)
      ? { stroke: lit, filter: `drop-shadow(0 0 6px ${lit})`, opacity: 1 }
      : { stroke: base, opacity: dimmed ? 0.35 : 1 }),
  });

  const litOf = (parts: PartId[]) => () => setActive(new Set(parts));
  const clear = () => setActive(null);

  return (
    <div className="fade-up mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Claims Explorer</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          The proposed claims (disclosure §18), mapped element-by-element onto the device.
          Hover a claim to light up the hardware that embodies it — or hover the hardware to
          find its claim.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Claim 1 elements */}
        <section className="card p-5">
          <p className="label mb-1">Independent claim 1 — system claim</p>
          <p className="mb-3 text-sm text-ink-2">
            A posture-adaptive hybrid acoustic sleep ear-wrap system comprising:
          </p>
          <ol className="space-y-1.5">
            {CLAIM1.map((el) => {
              const lit = active !== null && el.parts.some((p) => active.has(p)) ||
                (hoverPart !== null && el.parts.includes(hoverPart));
              return (
                <li
                  key={el.id}
                  onMouseEnter={litOf(el.parts)}
                  onMouseLeave={clear}
                  className={`cursor-default rounded-lg border px-3 py-2 text-[13px] leading-relaxed transition-colors ${
                    lit
                      ? "border-accent bg-[var(--accent-soft)] text-ink"
                      : "border-transparent text-ink-2 hover:border-hairline hover:bg-surface-2"
                  }`}
                >
                  <span className="mr-2 font-mono text-[11px] text-ink-muted">({el.id})</span>
                  {el.text};
                </li>
              );
            })}
          </ol>
        </section>

        {/* cross-section */}
        <section className="card sticky top-20 h-fit p-5">
          <p className="label mb-2">Device cross-section</p>
          <svg viewBox="0 0 420 400" className="w-full" role="img" aria-label="Layered cross-section of the ear-wrap device">
            {/* concentric wrap layers, opening to the right like a C around the ear */}
            {/* outer fabric */}
            <path
              d="M 300 40 A 160 160 0 1 0 300 360"
              fill="none"
              strokeWidth="20"
              strokeLinecap="round"
              onMouseEnter={() => setHoverPart("wrap")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("wrap", "var(--baseline)", "var(--accent)")}
            />
            {/* cushioning */}
            <path
              d="M 292 72 A 128 128 0 1 0 292 328"
              fill="none"
              strokeWidth="24"
              strokeLinecap="round"
              onMouseEnter={() => setHoverPart("cushion")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("cushion", "#4c4a42", "var(--violet)")}
            />
            {/* passive acoustic layer */}
            <path
              d="M 285 106 A 95 95 0 1 0 285 294"
              fill="none"
              strokeWidth="20"
              strokeLinecap="round"
              onMouseEnter={() => setHoverPart("passive")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("passive", "#3d3c38", "var(--series-3)")}
            />

            {/* ear */}
            <g opacity="0.9">
              <path
                d="M 205 165 q 28 -18 40 5 q 10 20 -8 34 q -14 11 -16 26 q -14 4 -20 -8"
                fill="none"
                stroke="var(--ink-muted)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <text x="196" y="245" fontSize="10" fill="var(--ink-muted)">ear</text>
            </g>

            {/* speaker */}
            <g
              onMouseEnter={() => setHoverPart("speaker")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("speaker", "var(--ink-muted)", "var(--series-1)")}
            >
              <rect x="128" y="182" width="30" height="36" rx="6" fill="var(--surface-2)" strokeWidth="2.5" />
              <path d="M136 192v16M143 188v24M150 192v16" stroke="inherit" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* internal mic */}
            <g
              onMouseEnter={() => setHoverPart("intmic")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("intmic", "var(--ink-muted)", "var(--series-5)")}
            >
              <circle cx="170" cy="130" r="10" fill="var(--surface-2)" strokeWidth="2.5" />
              <circle cx="170" cy="130" r="3.5" fill="currentColor" stroke="none" />
            </g>

            {/* external mic on the outer shell */}
            <g
              onMouseEnter={() => setHoverPart("extmic")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("extmic", "var(--ink-muted)", "var(--series-5)")}
            >
              <circle cx="62" cy="110" r="12" fill="var(--surface-2)" strokeWidth="2.5" />
              <circle cx="62" cy="110" r="4" fill="currentColor" stroke="none" />
              <path d="M40 92l8 8M36 108h10" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* IMU */}
            <g
              onMouseEnter={() => setHoverPart("imu")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("imu", "var(--ink-muted)", "var(--series-4)")}
            >
              <rect x="90" y="288" width="26" height="26" rx="5" fill="var(--surface-2)" strokeWidth="2.5" />
              <path d="M96 301h14M103 294v14" strokeWidth="1.5" />
            </g>

            {/* pressure sensor in cushion */}
            <g
              onMouseEnter={() => setHoverPart("psensor")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("psensor", "var(--ink-muted)", "var(--violet)")}
            >
              <rect x="152" y="322" width="34" height="10" rx="5" fill="var(--surface-2)" strokeWidth="2.5" />
            </g>

            {/* detachable control module */}
            <g
              onMouseEnter={() => setHoverPart("control")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("control", "var(--ink-muted)", "var(--accent)")}
            >
              <rect x="290" y="330" width="110" height="52" rx="10" fill="var(--surface-2)" strokeWidth="2.5" />
              <text x="345" y="352" textAnchor="middle" fontSize="10" fill="var(--ink-2)" stroke="none">DSP · MCU</text>
              <text x="345" y="366" textAnchor="middle" fontSize="8.5" fill="var(--ink-muted)" stroke="none">detachable module</text>
              {/* snap connector */}
              <path d="M300 330v-14h18v14" fill="none" strokeWidth="2" strokeDasharray="3 3" />
            </g>

            {/* battery inside module */}
            <g
              onMouseEnter={() => setHoverPart("battery")}
              onMouseLeave={() => setHoverPart(null)}
              style={partStyle("battery", "var(--ink-muted)", "var(--series-2)")}
            >
              <rect x="365" y="304" width="30" height="14" rx="4" fill="var(--surface-2)" strokeWidth="2.5" />
              <rect x="395" y="308" width="4" height="6" rx="1" fill="currentColor" stroke="none" />
            </g>
          </svg>
          <p className="mt-1 min-h-5 text-center text-xs font-medium text-ink-2">
            {hoverPart
              ? PART_LABELS[hoverPart]
              : active
                ? [...active].map((p) => PART_LABELS[p]).join(" · ")
                : "hover a layer or component"}
          </p>
        </section>
      </div>

      {/* dependent claims */}
      <section className="card p-5">
        <p className="label mb-3">Dependent claims 2–15</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {["Sensing", "Adaptive control", "Structure", "Feedback"].map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold text-ink-2">{group}</p>
              <ul className="space-y-1.5">
                {DEPENDENT.filter((c) => c.group === group).map((c) => (
                  <li
                    key={c.n}
                    onMouseEnter={litOf(c.parts)}
                    onMouseLeave={clear}
                    className="cursor-default rounded-lg border border-transparent px-2.5 py-2 text-xs leading-relaxed text-ink-muted transition-colors hover:border-hairline hover:bg-surface-2 hover:text-ink-2"
                  >
                    <span className="mr-1.5 font-mono text-[10px] text-accent">#{c.n}</span>
                    {c.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-hairline pt-3 text-[11px] text-ink-muted">
          Wording condensed for exploration — the disclosure document remains the authoritative
          claim text. All claims depend on claim 1.
        </p>
      </section>
    </div>
  );
}
