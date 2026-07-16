"use client";

// 240° arc gauge. Thin track, rounded data end, value in the middle.
export default function ArcGauge({
  value,
  min,
  max,
  label,
  unit,
  color = "var(--accent)",
  size = 132,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
}) {
  const r = 52;
  const cx = 60;
  const cy = 62;
  const startA = -210; // degrees
  const endA = 30;
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const arc = (fromDeg: number, toDeg: number) => {
    const [x1, y1] = polar(fromDeg);
    const [x2, y2] = polar(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const valueDeg = startA + frac * (endA - startA);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 120 116" width={size} height={size * 0.97} role="img" aria-label={`${label}: ${value}${unit ?? ""}`}>
        <path d={arc(startA, endA)} fill="none" stroke="var(--grid)" strokeWidth="7" strokeLinecap="round" />
        {frac > 0.005 && (
          <path d={arc(startA, valueDeg)} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
        )}
        <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--ink)" fontSize="21" fontWeight="600" className="tabular">
          {value.toFixed(unit === "×" ? 2 : 0)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--ink-muted)" fontSize="10">
          {unit ?? ""}
        </text>
        <text x={cx} y={cy + 42} textAnchor="middle" fill="var(--ink-2)" fontSize="10.5" fontWeight="500" letterSpacing="0.06em">
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
