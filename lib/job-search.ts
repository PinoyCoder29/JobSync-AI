import type { EmploymentType, ExperienceLevel, WorkArrangement } from "@prisma/client";
import type { JobFilters } from "@/repositories/job.repository";

export const JOB_SORTS = ["relevance", "newest", "salary_desc", "salary_asc", "best_match"] as const;
export type JobSort = (typeof JOB_SORTS)[number];
type Raw = Record<string, string | string[] | undefined>;

const ARRANGEMENTS = ["ONSITE", "HYBRID", "REMOTE"] as const;
const TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const;
const LEVELS = ["ENTRY", "JUNIOR", "MID", "SENIOR"] as const;

// Friendly URL values (spec) -> enum values. Old values and raw enum names are accepted too, so old bookmarks keep working.
const ARRANGEMENT_ALIASES: Record<string, WorkArrangement> = { "on-site": "ONSITE", onsite: "ONSITE", hybrid: "HYBRID", remote: "REMOTE" };
const TYPE_ALIASES: Record<string, EmploymentType> = { "full-time": "FULL_TIME", "part-time": "PART_TIME", contract: "CONTRACT", internship: "INTERNSHIP" };
const LEVEL_ALIASES: Record<string, ExperienceLevel> = { entry: "ENTRY", "entry-level": "ENTRY", "entry level": "ENTRY", junior: "JUNIOR", mid: "MID", "mid-level": "MID", "mid level": "MID", senior: "SENIOR" };
// legacy sort names from the previous version of the page
const SORT_ALIASES: Record<string, JobSort> = { recent: "newest", salary: "salary_desc", "salary-high": "salary_desc", "salary-low": "salary_asc", "best-match": "best_match" };

export const MAX_SKILLS = 8;

function pickEnum<T extends string>(allowed: readonly T[], aliases: Record<string, T>, value?: string): T | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase().replace(/-/g, "_");
  if ((allowed as readonly string[]).includes(upper)) return upper as T;
  return aliases[value.toLowerCase()];
}

/** Turns untrusted URL search params into a safe, typed filter object. */
export function parseJobSearch(raw: Raw): { filters: JobFilters; sort: JobSort; hasFilters: boolean } {
  const all = (key: string): string[] => {
    const v = raw[key];
    return (Array.isArray(v) ? v : v === undefined ? [] : [v]).map((s) => s.trim().slice(0, 100)).filter(Boolean);
  };
  const get = (key: string) => all(key)[0];

  const skills = [...new Set(all("skill").flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean))].slice(0, MAX_SKILLS);
  const minSalaryRaw = Number(get("minSalary"));
  const filters: JobFilters = {
    keyword: get("keyword") ?? get("q"), // `q` is what the old page and the top-bar search used
    location: get("location"),
    skills: skills.length ? skills : undefined,
    workArrangement: pickEnum<WorkArrangement>(ARRANGEMENTS, ARRANGEMENT_ALIASES, get("workArrangement") ?? get("arrangement")),
    employmentType: pickEnum<EmploymentType>(TYPES, TYPE_ALIASES, get("employmentType") ?? get("type")),
    experienceLevel: pickEnum<ExperienceLevel>(LEVELS, LEVEL_ALIASES, get("experienceLevel") ?? get("level")),
    minSalary: Number.isFinite(minSalaryRaw) && minSalaryRaw > 0 ? Math.min(Math.round(minSalaryRaw), 10_000_000) : undefined,
  };
  const requested = get("sort");
  const sort: JobSort =
    (JOB_SORTS as readonly string[]).includes(requested ?? "") ? (requested as JobSort) : SORT_ALIASES[requested ?? ""] ?? (filters.keyword ? "relevance" : "newest");
  const hasFilters = Object.values(filters).some((v) => v !== undefined);
  return { filters, sort, hasFilters };
}

const ARRANGEMENT_URL: Record<WorkArrangement, string> = { ONSITE: "on-site", HYBRID: "hybrid", REMOTE: "remote" };
const TYPE_URL: Record<EmploymentType, string> = { FULL_TIME: "full-time", PART_TIME: "part-time", CONTRACT: "contract", INTERNSHIP: "internship" };
const LEVEL_URL: Record<ExperienceLevel, string> = { ENTRY: "entry", JUNIOR: "junior", MID: "mid", SENIOR: "senior" };

/** Builds the query string for a filter set, using the same friendly values the spec shows. */
export function buildJobSearchParams(filters: JobFilters, sort?: JobSort): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.keyword) p.set("keyword", filters.keyword);
  if (filters.location) p.set("location", filters.location);
  filters.skills?.forEach((s) => p.append("skill", s));
  if (filters.workArrangement) p.set("workArrangement", ARRANGEMENT_URL[filters.workArrangement]);
  if (filters.employmentType) p.set("employmentType", TYPE_URL[filters.employmentType]);
  if (filters.experienceLevel) p.set("experienceLevel", LEVEL_URL[filters.experienceLevel]);
  if (filters.minSalary) p.set("minSalary", String(filters.minSalary));
  if (sort) p.set("sort", sort);
  return p;
}
