export default function StatTile({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-muted">{unit}</span>}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}
