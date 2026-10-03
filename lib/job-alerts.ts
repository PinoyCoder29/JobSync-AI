import type { EmploymentType, ExperienceLevel, WorkArrangement } from "@prisma/client";

export type AlertCriteria = {
  keyword?: string | null;
  location?: string | null;
  skills: string[];
  workArrangement?: WorkArrangement | null;
  employmentType?: EmploymentType | null;
  experienceLevel?: ExperienceLevel | null;
  minSalary?: number | null;
};

export type AlertableJob = {
  title: string;
  company: string;
  description: string;
  location: string;
  currency: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
};

const has = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());

/** Pure matcher: the in-memory twin of `buildJobWhere`, used when a NEW job is published to find alerts to notify. */
export function jobMatchesAlert(job: AlertableJob, alert: AlertCriteria): boolean {
  if (alert.keyword) {
    const words = alert.keyword.split(/\s+/).filter(Boolean);
    const text = `${job.title} ${job.company} ${job.description} ${job.skills.join(" ")}`;
    if (!words.every((w) => has(text, w))) return false;
  }
  if (alert.location) {
    const term = alert.location.trim().toLowerCase();
    const ok = has(job.location, term) || (term === "remote" && job.workArrangement === "REMOTE") || (term === "philippines" && job.currency === "PHP");
    if (!ok) return false;
  }
  if (alert.skills.length && !alert.skills.some((s) => job.skills.some((js) => js.toLowerCase() === s.toLowerCase()))) return false;
  if (alert.workArrangement && alert.workArrangement !== job.workArrangement) return false;
  if (alert.employmentType && alert.employmentType !== job.employmentType) return false;
  if (alert.experienceLevel && alert.experienceLevel !== job.experienceLevel) return false;
  if (alert.minSalary) {
    const top = job.salaryMax ?? job.salaryMin;
    if (top === null || top < alert.minSalary) return false;
  }
  return true;
}
