import type { EmploymentType, ExperienceLevel, WorkArrangement } from "@prisma/client";
import type { JobFilters } from "@/repositories/job.repository";

export type JobSort = "recent" | "salary" | "relevance";
type Raw = Record<string, string | string[] | undefined>;

const ARRANGEMENTS = ["ONSITE", "HYBRID", "REMOTE"] as const;
const TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const;
const LEVELS = ["ENTRY", "JUNIOR", "MID", "SENIOR"] as const;
const SORTS = ["recent", "salary", "relevance"] as const;

/** Turns untrusted URL search params into a safe, typed filter object. */
export function parseJobSearch(raw: Raw): { filters: JobFilters; sort: JobSort; hasFilters: boolean } {
  const get = (key: string) => {
    const v = Array.isArray(raw[key]) ? raw[key]![0] : raw[key];
    return v && v.trim() ? v.trim().slice(0, 100) : undefined;
  };
  const pick = <T extends string>(allowed: readonly T[], value?: string): T | undefined =>
    value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

  const minSalaryRaw = Number(get("minSalary"));
  const filters: JobFilters = {
    q: get("q"),
    location: get("location"),
    skill: get("skill"),
    arrangement: pick<WorkArrangement>(ARRANGEMENTS, get("arrangement")),
    type: pick<EmploymentType>(TYPES, get("type")),
    level: pick<ExperienceLevel>(LEVELS, get("level")),
    minSalary: Number.isFinite(minSalaryRaw) && minSalaryRaw > 0 ? minSalaryRaw : undefined,
  };
  const sort = pick(SORTS, get("sort")) ?? (filters.q ? "relevance" : "recent");
  const hasFilters = Object.values(filters).some((v) => v !== undefined);
  return { filters, sort, hasFilters };
}
