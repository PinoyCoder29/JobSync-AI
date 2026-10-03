import type { EmploymentType, ExperienceLevel, Prisma, WorkArrangement } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Salary is ALWAYS monthly, in the job's own currency (Job.salaryMin / Job.salaryMax / Job.currency).
 * Never store annual figures in these columns; convert before saving.
 */
export type JobFilters = {
  /** matched against title, company, description and skills; every word must match somewhere */
  keyword?: string;
  location?: string;
  /** any of these skills */
  skills?: string[];
  workArrangement?: WorkArrangement;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  /** minimum MONTHLY salary */
  minSalary?: number;
};

const include = { skills: { include: { skill: true } } } satisfies Prisma.JobInclude;
export type JobWithSkills = Prisma.JobGetPayload<{ include: typeof include }>;

const ci = (value: string) => ({ contains: value, mode: "insensitive" as const });

/** Location terms that mean a whole country: matched on the job's currency as well as its location text. */
const COUNTRY_CURRENCY: Record<string, string> = { philippines: "PHP", "the philippines": "PHP", ph: "PHP" };

export function buildJobWhere(filters: JobFilters): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [{ isActive: true }];

  if (filters.keyword) {
    for (const word of filters.keyword.split(/\s+/).filter(Boolean).slice(0, 6)) {
      and.push({
        OR: [
          { title: ci(word) },
          { company: ci(word) },
          { description: ci(word) },
          { skills: { some: { skill: { name: ci(word) } } } },
        ],
      });
    }
  }

  if (filters.location) {
    const term = filters.location.trim().toLowerCase();
    const or: Prisma.JobWhereInput[] = [{ location: ci(filters.location.trim()) }];
    if (term === "remote") or.push({ workArrangement: "REMOTE" });
    if (COUNTRY_CURRENCY[term]) or.push({ currency: COUNTRY_CURRENCY[term] });
    and.push({ OR: or });
  }

  if (filters.skills?.length) {
    and.push({ OR: filters.skills.map((name) => ({ skills: { some: { skill: { name: { equals: name, mode: "insensitive" as const } } } } })) });
  }
  if (filters.workArrangement) and.push({ workArrangement: filters.workArrangement });
  if (filters.employmentType) and.push({ employmentType: filters.employmentType });
  if (filters.experienceLevel) and.push({ experienceLevel: filters.experienceLevel });
  if (filters.minSalary) {
    and.push({ OR: [{ salaryMax: { gte: filters.minSalary } }, { salaryMax: null, salaryMin: { gte: filters.minSalary } }] });
  }
  return { AND: and };
}

export type DbJobOrder = "newest" | "salary_desc" | "salary_asc";

function orderBy(order: DbJobOrder): Prisma.JobOrderByWithRelationInput[] {
  if (order === "salary_desc") return [{ salaryMax: { sort: "desc", nulls: "last" } }, { postedAt: "desc" }, { id: "desc" }];
  if (order === "salary_asc") return [{ salaryMin: { sort: "asc", nulls: "last" } }, { postedAt: "desc" }, { id: "desc" }];
  return [{ postedAt: "desc" }, { id: "desc" }];
}

export const jobRepository = {
  /** Legacy shape used by the JobProvider contract. */
  search(filters: JobFilters, take = 100) {
    return prisma.job.findMany({ where: buildJobWhere(filters), include, orderBy: orderBy("newest"), take });
  },

  /** One database page, ordered in SQL. `take + 1` rows are returned so the caller can tell if there is more. */
  page(filters: JobFilters, order: DbJobOrder, skip: number, take: number) {
    return prisma.job.findMany({ where: buildJobWhere(filters), include, orderBy: orderBy(order), skip, take: take + 1 });
  },

  /** A bounded candidate window for sorts that need in-memory scoring (relevance, best match). */
  candidates(filters: JobFilters, take = 300) {
    return prisma.job.findMany({ where: buildJobWhere(filters), include, orderBy: orderBy("newest"), take });
  },

  findById(id: string) {
    return prisma.job.findFirst({ where: { id, isActive: true }, include });
  },
  listActive(take = 50) {
    return prisma.job.findMany({ where: { isActive: true }, include, orderBy: { postedAt: "desc" }, take });
  },
  listByIds(ids: string[]) {
    return prisma.job.findMany({ where: { id: { in: ids }, isActive: true }, include });
  },

  /** Skills used by active jobs, most common first. Powers the skill picker and "Skills in demand". */
  async topSkills(limit = 12) {
    const rows = await prisma.jobSkill.groupBy({
      by: ["skillId"],
      where: { job: { isActive: true } },
      _count: { _all: true },
      orderBy: { _count: { skillId: "desc" } },
      take: limit,
    });
    if (rows.length === 0) return [];
    const skills = await prisma.skill.findMany({ where: { id: { in: rows.map((r) => r.skillId) } }, select: { id: true, name: true } });
    const byId = new Map(skills.map((s) => [s.id, s.name]));
    return rows.flatMap((r) => (byId.has(r.skillId) ? [{ name: byId.get(r.skillId)!, jobs: r._count._all }] : []));
  },

  /** Companies with the most open jobs (companies are plain text on Job today; there is no Company table yet). */
  async topCompanies(limit = 6) {
    const rows = await prisma.job.groupBy({
      by: ["company"],
      where: { isActive: true },
      _count: { _all: true },
      orderBy: [{ _count: { company: "desc" } }, { company: "asc" }],
      take: limit,
    });
    return rows.map((r) => ({ name: r.company, jobs: r._count._all }));
  },

  /** Name suggestions for the skill filter. */
  async skillNames(prefix: string, limit = 10) {
    const rows = await prisma.skill.findMany({
      where: prefix ? { name: { startsWith: prefix, mode: "insensitive" } } : { jobSkills: { some: { job: { isActive: true } } } },
      select: { name: true },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((r) => r.name);
  },

  /** Distinct companies matching a text query, for global search. */
  async searchCompanies(query: string, limit = 5) {
    const rows = await prisma.job.groupBy({
      by: ["company"],
      where: { isActive: true, company: ci(query) },
      _count: { _all: true },
      orderBy: { company: "asc" },
      take: limit,
    });
    return rows.map((r) => ({ name: r.company, jobs: r._count._all }));
  },
};
