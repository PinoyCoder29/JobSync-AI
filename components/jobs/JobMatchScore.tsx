import { scoreTone } from "@/lib/labels";

export function MatchPill({ value }: { value: number | null }) {
  if (value === null) return null;
  return <span className={`match-pill tone-${scoreTone(value)}`} title="Demo match score based on your profile and resume">{value}% match</span>;
}
