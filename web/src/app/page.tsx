import Link from "next/link";
import StatTile from "@/components/StatTile";

const PIPELINE = [
  { step: "Sense", desc: "External mics sample the room; IMU reads posture; thin-film sensors read pillow pressure.", icon: "🎙️" },
  { step: "Analyze", desc: "DSP decomposes the noise — steady hum vs sudden transients — in 1–20 ms.", icon: "🧠" },
  { step: "Adapt", desc: "Controller re-weights each ear's ANC to the posture: pillow side coasts, exposed side works.", icon: "⚖️" },
  { step: "Cancel", desc: "Speakers emit the anti-phase wave; passive layers soak up what's left.", icon: "🔇" },
  { step: "Refine", desc: "Feedback mics measure the residual and close the loop, every cycle, all night.", icon: "🔁" },
];

const SUBSYSTEMS = [
  ["Flexible ear-wrap structure", "breathable, hypoallergenic, side-sleep friendly"],
  ["Multi-layer acoustic shield", "fabric + viscoelastic foam + gel membrane"],
  ["Pressure-adaptive cushioning", "redistributes pillow load, keeps the seal"],
  ["Hybrid ANC subsystem", "external + feedback mics, anti-noise transducers"],
  ["Posture detection", "IMU senses left / right / supine in real time"],
  ["Adaptive control unit", "multi-input optimization: noise + posture + pressure"],
  ["Power management", "50–500 mW adaptive draw, all-night battery"],
  ["Modular electronics", "detaches in one click — the fabric is washable"],
];

const COMPARISON: [string, string, string][] = [
  ["Noise handling", "Effective mainly for steady low-frequency noise", "Hybrid passive + active covers steady hum and irregular spikes"],
  ["Posture awareness", "None — static operation in every position", "ANC re-tunes asymmetrically as the sleeper turns"],
  ["Side-sleeping comfort", "Rigid cups / earbud pressure pain", "Dynamic pressure compensation, 0.5–10 kPa managed"],
  ["Power use", "Fixed ANC drain", "Backs off when the pillow already blocks one ear"],
  ["Hygiene", "Electronics sealed into the fabric", "Detachable module — wash the wrap, keep the brains"],
];

const EMBODIMENTS = [
  "Headband form", "Ultra-thin earcup", "Shallow in-ear hybrid", "Pillow-integrated",
  "AI-personalized", "Health-monitoring", "Smart-home linked", "Travel compact", "Clinical grade",
];

const FEATURES = [
  {
    href: "/live",
    title: "Live Dashboard",
    desc: "A digital twin of the device streaming 5 frames/sec — turn the sleeper and watch both ears re-tune. Hardware-ready: a real ESP32 can take over the feed.",
    cta: "Open the twin",
  },
  {
    href: "/demo",
    title: "ANC Audio Lab",
    desc: "The claim you can hear. Play traffic or snoring, then flip the passive and active layers on and listen to them vanish — with the anti-phase wave on the scope.",
    cta: "Hear it work",
  },
  {
    href: "/claims",
    title: "Claims Explorer",
    desc: "All 15 proposed claims wired to an interactive cross-section — hover a claim element and the exact hardware that embodies it lights up.",
    cta: "Explore claims",
  },
  {
    href: "/replay",
    title: "Night Replay",
    desc: "Eight hours in sixty seconds: a flight recorder of one full night — posture shifts, noise events, ANC response, battery curve.",
    cta: "Replay the night",
  },
];

export default function OverviewPage() {
  return (
    <div className="fade-up mx-auto max-w-6xl space-y-10">
      {/* hero */}
      <section className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-1 px-6 py-12 text-center lg:px-16 lg:py-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 50% -20%, rgba(144,133,233,0.14), transparent 70%)",
          }}
        />
        <p className="relative mx-auto mb-4 w-fit rounded-full border border-hairline bg-surface-2 px-3 py-1 text-[11px] font-semibold tracking-wide text-ink-2">
          INVENTIVE DISCLOSURE · PATENT IN PREPARATION · VIT CHENNAI
        </p>
        <h1 className="relative mx-auto max-w-3xl text-3xl font-semibold leading-tight tracking-tight lg:text-[42px]">
          The ear-wrap that knows <span className="text-violet">how you sleep</span> — and
          silences the night around it.
        </h1>
        <p className="relative mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-2 lg:text-base">
          A posture-adaptive hybrid acoustic sleep ear-wrap with dynamic pressure compensation
          and modular active noise control. It hears the room, feels the pillow, knows which ear
          is exposed — and re-tunes its cancellation every few milliseconds, all night long.
        </p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/demo"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03]"
          >
            🎧 Hear the invention
          </Link>
          <Link
            href="/live"
            className="rounded-full border border-hairline bg-surface-2 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-[var(--accent-soft)]"
          >
            Open the live twin
          </Link>
        </div>
      </section>

      {/* headline numbers — from the disclosure's parameter table (§21) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Feedback loop" value="1–20" unit="ms" sub="real-time anti-noise correction" accent="var(--accent)" />
        <StatTile label="ANC gain range" value="0.5–2.5×" sub="per ear, posture-weighted" />
        <StatTile label="Power draw" value="50–500" unit="mW" sub="adaptive, all-night battery" />
        <StatTile label="Development stage" value="TRL 5" sub="validated in relevant environment" accent="var(--violet)" />
      </section>

      {/* interactive features */}
      <section>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Explore the invention</h2>
        <p className="mb-4 text-sm text-ink-muted">
          Four interactive instruments, all fed by the same device model.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="card group flex flex-col p-5 transition-colors hover:border-[var(--accent)] hover:bg-surface-2"
            >
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-muted">{f.desc}</p>
              <span className="mt-3 text-sm font-medium text-accent transition-transform group-hover:translate-x-1">
                {f.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* closed loop */}
      <section>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">One closed loop, five moves</h2>
        <p className="mb-4 text-sm text-ink-muted">
          The working principle from the disclosure (§8) — a continuous sense → refine cycle.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <div key={p.step} className="card relative p-4">
              <span className="absolute right-3 top-3 text-[11px] font-bold text-ink-muted">{i + 1}</span>
              <span className="text-xl" aria-hidden>{p.icon}</span>
              <h3 className="mt-2 text-sm font-semibold">{p.step}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* why it's new */}
      <section>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Why this is new</h2>
        <p className="mb-4 max-w-2xl text-sm text-ink-muted">
          Existing devices do one thing statically. The invention integrates posture, pressure
          and hybrid acoustics into one adaptive system — the combination no prior art teaches.
        </p>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-130 text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-muted">
                <th className="px-4 py-3 font-semibold">Dimension</th>
                <th className="px-4 py-3 font-semibold">Existing devices</th>
                <th className="px-4 py-3 font-semibold text-accent">This invention</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([dim, old, ours]) => (
                <tr key={dim} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-2">{dim}</td>
                  <td className="px-4 py-3 text-ink-muted">{old}</td>
                  <td className="px-4 py-3 text-ink-2">{ours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* subsystems */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Eight subsystems, one system</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SUBSYSTEMS.map(([name, desc]) => (
            <div key={name} className="card p-4">
              <h3 className="text-[13px] font-semibold leading-snug">{name}</h3>
              <p className="mt-1 text-xs text-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* embodiments */}
      <section>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Beyond the first embodiment</h2>
        <p className="mb-4 text-sm text-ink-muted">
          The disclosure claims a family of variants (§11) — the same inventive core, many forms.
        </p>
        <div className="flex flex-wrap gap-2">
          {EMBODIMENTS.map((e) => (
            <span key={e} className="rounded-full border border-hairline bg-surface-1 px-3.5 py-1.5 text-xs text-ink-2">
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* footer note */}
      <section className="card border-[rgba(236,131,90,0.35)] p-5">
        <p className="text-xs leading-relaxed text-ink-2">
          <span className="font-semibold text-serious">Confidentiality notice.</span> This site
          presents material from an unfiled inventive disclosure. Keep it on a local or
          access-controlled deployment until the patent application is filed — public disclosure
          before filing can destroy novelty.
        </p>
      </section>
    </div>
  );
}
