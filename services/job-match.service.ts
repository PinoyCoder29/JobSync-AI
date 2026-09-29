import type { WorkArrangement } from "@prisma/client";
import { analysisRepository } from "@/repositories/analysis.repository";
import type { JobWithSkills } from "@/repositories/job.repository";
import { profileRepository } from "@/repositories/profile.repository";
import { resumeRepository } from "@/repositories/resume.repository";

export type MatchBreakdown = { overall: number; skills: number; experience: number; education: number; location: number };

export type Candidate = {
  skills: string[];
  years: number;
  hasEducation: boolean;
  location: string;
  preferredLocations: string[];
  arrangement: WorkArrangement | null;
};

const REQUIRED_YEARS = { ENTRY: 0, JUNIOR: 1, MID: 3, SENIOR: 5 } as const;
const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function yearsBetween(start: string, end: string): number {
  const s = /^(\d{4})-(\d{2})/.exec(start);
  if (!s) return 0;
  const e = /^(\d{4})-(\d{2})/.exec(end);
  const startMonths = Number(s[1]) * 12 + Number(s[2]);
  const endMonths = e ? Number(e[1]) * 12 + Number(e[2]) : new Date().getFullYear() * 12 + new Date().getMonth() + 1;
  return Math.max(0, (endMonths - startMonths) / 12);
}

/**
 * DEMO matching: a simple weighted heuristic so the UI has honest, deterministic numbers.
 * Replace the body (or delegate to an AI provider) later without changing callers.
 */
export function computeMatch(job: JobWithSkills, c: Candidate): MatchBreakdown {
  const have = new Set(c.skills.map((s) => s.toLowerCase()));
  let total = 0;
  let earned = 0;
  for (const js of job.skills) {
    const weight = js.required ? 1 : 0.5;
    total += weight;
    if (have.has(js.skill.name.toLowerCase())) earned += weight;
  }
  const skills = total ? pct((earned / total) * 100) : 50;

  const required = REQUIRED_YEARS[job.experienceLevel];
  const experience = required === 0 ? 100 : pct((c.years / required) * 100);
  const education = c.hasEducation ? 100 : 50;

  const jobCity = job.location.toLowerCase();
  const places = [c.location, ...c.preferredLocations].map((p) => p.toLowerCase()).filter(Boolean);
  const nearby = places.some((p) => jobCity.includes(p.split(",")[0].trim()) || p.includes(jobCity.split(",")[0].trim()));
  let location = job.workArrangement === "REMOTE" ? 100 : nearby ? 100 : 40;
  if (c.arrangement && c.arrangement !== job.workArrangement) location = Math.max(0, location - 15);

  const overall = pct(skills * 0.5 + experience * 0.2 + education * 0.1 + location * 0.2);
  return { overall, skills, experience, education, location };
}

export const jobMatchService = {
  async loadCandidate(userId: string): Promise<Candidate> {
    const [profile, userSkills, resume] = await Promise.all([
      profileRepository.findByUser(userId),
      profileRepository.listSkills(userId),
      resumeRepository.findByUser(userId),
    ]);
    const skills = new Set<string>(userSkills.map((s) => s.skill.name));
    resume?.skills.forEach((s) => skills.add(s.skill.name));
    return {
      skills: [...skills],
      years: resume?.experiences.reduce((sum, e) => sum + yearsBetween(e.startDate, e.endDate), 0) ?? 0,
      hasEducation: (resume?.education.length ?? 0) > 0,
      location: profile?.location ?? "",
      preferredLocations: profile?.preferredLocations ?? [],
      arrangement: profile?.preferredWorkArrangement ?? null,
    };
  },

  async forUser(userId: string, jobs: JobWithSkills[], opts: { persist?: boolean } = {}): Promise<Map<string, MatchBreakdown>> {
    const candidate = await this.loadCandidate(userId);
    const map = new Map(jobs.map((j) => [j.id, computeMatch(j, candidate)]));
    if (opts.persist) {
      await analysisRepository.saveMatches([...map.entries()].map(([jobId, m]) => ({ userId, jobId, ...m })));
    }
    return map;
  },
};
