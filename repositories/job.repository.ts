import type { EmploymentType, ExperienceLevel, Prisma, WorkArrangement } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type JobFilters = {
  q?: string;
  location?: string;
  skill?: string;
  arrangement?: WorkArrangement;
  type?: EmploymentType;
  level?: ExperienceLevel;
  minSalary?: number;
};

const include = { skills: { include: { skill: true } } } satisfies Prisma.JobInclude;
export type JobWithSkills = Prisma.JobGetPayload<{ include: typeof include }>;

const ci = (value: string) => ({ contains: value, mode: "insensitive" as const });

export const jobRepository = {
  search(filters: JobFilters, take = 100) {
    const and: Prisma.JobWhereInput[] = [{ isActive: true }];
    if (filters.q) {
      and.push({
        OR: [
          { title: ci(filters.q) },
          { company: ci(filters.q) },
          { skills: { some: { skill: { name: ci(filters.q) } } } },
        ],
      });
    }
    if (filters.location) and.push({ location: ci(filters.location) });
    if (filters.skill) and.push({ skills: { some: { skill: { name: ci(filters.skill) } } } });
    if (filters.arrangement) and.push({ workArrangement: filters.arrangement });
    if (filters.type) and.push({ employmentType: filters.type });
    if (filters.level) and.push({ experienceLevel: filters.level });
    if (filters.minSalary) and.push({ salaryMax: { gte: filters.minSalary } });

    return prisma.job.findMany({ where: { AND: and }, include, orderBy: { postedAt: "desc" }, take });
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
};
