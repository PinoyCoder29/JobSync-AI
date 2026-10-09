import { scoreTone } from "@/lib/labels";

export function ScoreRing({
  value,
  label,
  size = 96,
}: {
  value: number | null;
  label: string;
  size?: number;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <div
      className="score-ring"
      style={{ width: size }}
      role="img"
      aria-label={`${label}: ${value === null ? "not available yet" : `${v} out of 100`}`}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className={`ring-value tone-${scoreTone(v)}`}
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="55" textAnchor="middle" className="ring-text">
          {value === null ? "–" : v}
        </text>
      </svg>
      <div className="ring-label">{label}</div>
    </div>
  );
}
