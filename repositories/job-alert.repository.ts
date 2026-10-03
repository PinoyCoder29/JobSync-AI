import type { EmploymentType, ExperienceLevel, WorkArrangement } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NewJobAlert = {
  userId: string;
  keyword?: string;
  location?: string;
  skills: string[];
  workArrangement?: WorkArrangement;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  minSalary?: number;
};

export const jobAlertRepository = {
  listByUser(userId: string) {
    return prisma.jobAlert.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  },
  count(userId: string) {
    return prisma.jobAlert.count({ where: { userId } });
  },
  create(data: NewJobAlert) {
    return prisma.jobAlert.create({ data });
  },
  /** userId in the filter: nobody can delete someone else's alert. */
  async deleteOwned(id: string, userId: string) {
    return (await prisma.jobAlert.deleteMany({ where: { id, userId } })).count === 1;
  },
  activeBatch(skip: number, take: number) {
    return prisma.jobAlert.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, skip, take });
  },
};
