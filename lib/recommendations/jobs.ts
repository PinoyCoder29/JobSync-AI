import type { EmploymentType, ExperienceLevel, WorkArrangement } from "@prisma/client";

/**
 * Deterministic job recommendation scoring. Pure functions only (no database, no AI), so it works when Gemini is
 * unavailable, is easy to test, and every score can explain itself.
 *
 * The percentage is an internal recommendation indicator, NOT a guarantee of fit or of being hired.
 * A factor with no data for the user is left out (and the rest re-weighted) rather than guessed, and no
 * reason is ever produced without real overlapping data behind it.
 */
export const JOB_WEIGHTS = {
  skills: 0.32,
  role: 0.18,
  location: 0.1,
  experience: 0.1,
  salary: 0.1,
  workArrangement: 0.08,
  employment: 0.04,
  similarToSaved: 0.08,
} as const;

export type FactorKey = keyof typeof JOB_WEIGHTS;

export type JobSignals = {
  title: string;
  location: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: { name: string; required: boolean }[];
};

export type JobCandidate = {
  skills: string[];
  targetRoles: string[];
  years: number;
  location: string;
  preferredLocations: string[];
  arrangement: WorkArrangement | null;
  salaryMin: number | null;
  salaryMax: number | null;
  /** skills seen on jobs the user saved or applied to */
  interactionSkills: string[];
  /** employment types of jobs the user saved or applied to */
  interactionEmploymentTypes: EmploymentType[];
};

export type JobScore = {
  score: number;
  label: "Strong match" | "Good match" | "Recommended for you";
  factors: Record<FactorKey, number | null>;
  /** explainable reasons, most important first; always derived from real data */
  reasons: string[];
};

const REQUIRED_YEARS: Record<ExperienceLevel, number> = { ENTRY: 0, JUNIOR: 1, MID: 3, SENIOR: 5 };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const norm = (s: string) => s.trim().toLowerCase();
const STOP = new Set(["and", "the", "for", "with", "of", "a", "an", "in", "at", "to", "jr", "sr"]);
const tokens = (s: string) => norm(s).split(/[^a-z0-9+#.]+/).filter((t) => t.length > 1 && !STOP.has(t));

export function labelFor(score: number): JobScore["label"] {
  return score >= 80 ? "Strong match" : score >= 60 ? "Good match" : "Recommended for you";
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function scoreJob(job: JobSignals, c: JobCandidate): JobScore {
  const factors: Record<FactorKey, number | null> = {
    skills: null, role: null, location: null, experience: null, salary: null, workArrangement: null, employment: null, similarToSaved: null,
  };
  const reasons: { weight: number; text: string }[] = [];

  // skills (required skills count double)
  const have = new Set(c.skills.map(norm));
  if (job.skills.length > 0 && have.size > 0) {
    let total = 0;
    let earned = 0;
    const matched: string[] = [];
    for (const s of job.skills) {
      const w = s.required ? 1 : 0.5;
      total += w;
      if (have.has(norm(s.name))) {
        earned += w;
        matched.push(s.name);
      }
    }
    factors.skills = clamp((earned / total) * 100);
    if (matched.length) reasons.push({ weight: 10, text: `Recommended because you have ${list(matched.slice(0, 3))} skills.` });
  }

  // target role: share of the target role's words found in the job title
  if (c.targetRoles.length > 0) {
    const titleTokens = new Set(tokens(job.title));
    let best = 0;
    let bestRole = "";
    for (const role of c.targetRoles) {
      const rt = tokens(role);
      if (!rt.length) continue;
      const share = rt.filter((t) => titleTokens.has(t)).length / rt.length;
      if (share > best) { best = share; bestRole = role; }
    }
    factors.role = clamp(best * 100);
    if (best >= 0.5) reasons.push({ weight: 9, text: `Matches your target role: ${bestRole}.` });
  }

  // location
  const places = [c.location, ...c.preferredLocations].map(norm).filter(Boolean);
  if (places.length > 0 || job.workArrangement === "REMOTE") {
    const jobPlace = norm(job.location);
    const nearby = places.some((p) => jobPlace.includes(p.split(",")[0].trim()) || p.includes(jobPlace.split(",")[0].trim()));
    factors.location = job.workArrangement === "REMOTE" ? 100 : nearby ? 100 : places.length ? 35 : null;
    if (job.workArrangement !== "REMOTE" && nearby) reasons.push({ weight: 4, text: "Located in or near a place you prefer." });
  }

  // work arrangement
  if (c.arrangement) {
    const a = c.arrangement;
    factors.workArrangement = a === job.workArrangement ? 100 : a === "HYBRID" || job.workArrangement === "HYBRID" ? 55 : 15;
    if (a === job.workArrangement) {
      reasons.push({ weight: 6, text: a === "REMOTE" ? "Matches your preferred remote work setup." : `Matches your preferred ${a === "HYBRID" ? "hybrid" : "on-site"} work setup.` });
    }
  }

  // experience (only when the user has resume experience data or the job is entry level)
  const required = REQUIRED_YEARS[job.experienceLevel];
  if (c.years > 0 || required === 0) {
    factors.experience = required === 0 ? 100 : clamp((c.years / required) * 100);
    if (factors.experience >= 90 && c.years > 0) reasons.push({ weight: 3, text: "Fits your experience level." });
  }

  // salary (monthly, same unit as the job): never guess when either side has no figures
  const wantMin = c.salaryMin ?? c.salaryMax;
  const wantMax = c.salaryMax ?? c.salaryMin;
  const jobMin = job.salaryMin ?? job.salaryMax;
  const jobMax = job.salaryMax ?? job.salaryMin;
  if (wantMin !== null && wantMax !== null && jobMin !== null && jobMax !== null) {
    if (jobMax >= wantMin) factors.salary = 100;
    else factors.salary = clamp(Math.pow(jobMax / wantMin, 2) * 100);
    if (factors.salary === 100) reasons.push({ weight: 5, text: "Pays within or above your salary expectation." });
  }

  // employment type: learned only from jobs the user saved or applied to
  if (c.interactionEmploymentTypes.length > 0) {
    factors.employment = c.interactionEmploymentTypes.includes(job.employmentType) ? 100 : 40;
  }

  // similarity to saved/applied jobs
  const seen = new Set(c.interactionSkills.map(norm));
  if (seen.size > 0 && job.skills.length >= 2) {
    const overlap = job.skills.filter((s) => seen.has(norm(s.name))).length;
    factors.similarToSaved = clamp((overlap / job.skills.length) * 100);
    if (overlap / job.skills.length >= 0.5) reasons.push({ weight: 7, text: "Similar to jobs you saved or applied to." });
  }

  let weighted = 0;
  let weightSum = 0;
  (Object.keys(JOB_WEIGHTS) as FactorKey[]).forEach((key) => {
    const v = factors[key];
    if (v === null) return;
    weighted += v * JOB_WEIGHTS[key];
    weightSum += JOB_WEIGHTS[key];
  });
  // With no profile data at all there is nothing honest to score: use a neutral value instead of inventing one.
  const score = weightSum === 0 ? 50 : clamp(weighted / weightSum);

  return {
    score,
    label: labelFor(score),
    factors,
    reasons: reasons.sort((a, b) => b.weight - a.weight).map((r) => r.text).slice(0, 3),
  };
}
