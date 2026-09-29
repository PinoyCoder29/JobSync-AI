export function SkillBadge({ name, tone = "neutral" }: { name: string; tone?: "neutral" | "have" | "missing" }) {
  return <span className={`skill-badge skill-${tone}`}>{name}</span>;
}
