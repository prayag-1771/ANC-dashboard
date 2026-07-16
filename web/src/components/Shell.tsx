"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useTelemetry } from "@/lib/telemetry";

const TelemetryContext = createContext<ReturnType<typeof useTelemetry> | null>(null);

export function useSharedTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useSharedTelemetry must be used inside <Shell>");
  return ctx;
}

const NAV = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/live",
    label: "Live Dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <path d="M2 10h3l2.5-6 4 12L14 10h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/demo",
    label: "ANC Audio Lab",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <path d="M3 8v4M6.5 5.5v9M10 3v14M13.5 6.5v7M17 8.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/claims",
    label: "Claims Explorer",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <path d="M5 2.5h7l3.5 3.5v11.5h-10.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 9h5M8 12.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/replay",
    label: "Night Replay",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 6v4.4l3 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function StatusPill() {
  const { status, frame } = useSharedTelemetry();
  const mode = frame?.mode;
  const cfg =
    status !== "live"
      ? { color: "var(--status-critical)", text: status === "connecting" ? "Connecting…" : "Server offline" }
      : mode === "hardware"
        ? { color: "var(--status-good)", text: "Hardware · live" }
        : { color: "var(--accent)", text: "Simulation · live" };
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-1 px-3 py-1.5 text-xs font-medium text-ink-2"
      title="Telemetry link status — a real ESP32 prototype switches this to Hardware automatically"
    >
      <span className="pulse-dot size-2 rounded-full" style={{ background: cfg.color }} />
      {cfg.text}
    </span>
  );
}

function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    if (next) {
      document.documentElement.dataset.theme = "light";
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* private mode */
    }
  };

  return (
    <button
      onClick={toggle}
      className="grid size-8 place-items-center rounded-full border border-hairline bg-surface-1 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      title={light ? "Switch to dark theme" : "Switch to light theme"}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
    >
      {light ? (
        /* moon — click to go dark */
        <svg viewBox="0 0 20 20" fill="none" className="size-4">
          <path d="M13 3a7.5 7.5 0 1 0 4 13.5A8.4 8.4 0 0 1 13 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ) : (
        /* sun — click to go light */
        <svg viewBox="0 0 20 20" fill="none" className="size-4">
          <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-[var(--accent-soft)] text-ink font-medium"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span className={active ? "text-accent" : "text-ink-muted"}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 px-1">
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--violet-soft)] text-violet">
        {/* crescent + cancelled wave mark */}
        <svg viewBox="0 0 24 24" fill="none" className="size-5">
          <path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.5A9.7 9.7 0 0 1 15.5 3.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M3 12c1.2-1.6 2.4 1.6 3.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">SomnoShield</span>
        <span className="block text-[11px] text-ink-muted">ANC Sleep Ear-Wrap</span>
      </span>
    </Link>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const telemetry = useTelemetry();
  return (
    <TelemetryContext.Provider value={telemetry}>
      <div className="relative z-10 flex min-h-dvh">
        {/* sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-hairline bg-sidebar p-4 lg:flex">
          <Logo />
          <Nav />
          <div className="mt-auto space-y-3">
            <div className="rounded-lg border border-hairline bg-surface-1 p-3 text-[11px] leading-relaxed text-ink-muted">
              <span className="font-semibold text-serious">CONFIDENTIAL</span> — inventive
              disclosure material. Do not publish or share publicly before the patent
              application is filed.
            </div>
            <p className="px-1 text-[11px] text-ink-muted">
              Patent disclosure · VIT Chennai
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* top bar */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-hairline bg-[color-mix(in_srgb,var(--plane)_88%,transparent)] px-4 py-3 backdrop-blur-md lg:px-8">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="hidden text-sm text-ink-muted lg:block">
              Posture-Adaptive Hybrid Acoustic Sleep Ear-Wrap System
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <StatusPill />
            </div>
          </header>

          {/* mobile nav */}
          <div className="flex gap-1 overflow-x-auto border-b border-hairline bg-sidebar px-3 py-2 lg:hidden">
            <Nav />
          </div>

          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>

          <footer className="border-t border-hairline px-4 py-4 text-center text-[11px] text-ink-muted lg:px-8">
            Inventors: Dr. Shivani Gupta · Tushar Sharma — VIT Chennai · Inventive disclosure, confidential
          </footer>
        </div>
      </div>
    </TelemetryContext.Provider>
  );
}
