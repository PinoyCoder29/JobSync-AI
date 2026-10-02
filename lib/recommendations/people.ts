/**
 * Deterministic "people you may know" scoring. Pure functions only (no database, no AI) so it is
 * easy to test and every suggestion can explain itself. Weights are configurable in one place.
 */
export const PEOPLE_WEIGHTS = {
  sharedSkill: 3,
  sharedSkillCap: 5, // stop counting after this many, so one huge skill list can't dominate
  sharedTargetRole: 2,
  sameLocation: 2,
} as const;

export type PersonSignals = {
  skills: string[];
  targetRoles: string[];
  location: string | null;
};

export type PersonScore = { score: number; reasons: string[] };

const norm = (value: string) => value.trim().toLowerCase();
const overlap = (a: string[], b: string[]) => {
  const bSet = new Set(b.map(norm));
  const seen = new Set<string>();
  return a.filter((item) => {
    const key = norm(item);
    if (!key || seen.has(key) || !bSet.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function scorePerson(viewer: PersonSignals, candidate: PersonSignals, weights = PEOPLE_WEIGHTS): PersonScore {
  let score = 0;
  const reasons: string[] = [];

  const skills = overlap(candidate.skills, viewer.skills);
  if (skills.length) {
    score += Math.min(skills.length, weights.sharedSkillCap) * weights.sharedSkill;
    reasons.push(`${skills.length} shared skill${skills.length === 1 ? "" : "s"}: ${skills.slice(0, 3).join(", ")}`);
  }

  const roles = overlap(candidate.targetRoles, viewer.targetRoles);
  if (roles.length) {
    score += roles.length * weights.sharedTargetRole;
    reasons.push(`Also looking for ${roles[0]}`);
  }

  if (viewer.location && candidate.location && norm(viewer.location) === norm(candidate.location)) {
    score += weights.sameLocation;
    reasons.push(`Also based in ${candidate.location}`);
  }

  return { score, reasons };
}
