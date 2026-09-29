import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NewApplication = {
  userId: string;
  jobId?: string | null;
  company: string;
  position: string;
  status: ApplicationStatus;
  appliedAt: Date;
  nextStep?: string | null;
  notes?: string | null;
  jobUrl?: string | null;
};

export const applicationRepository = {
  listByUser(userId: string, status?: ApplicationStatus) {
    return prisma.application.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { appliedAt: "desc" },
      include: { history: { orderBy: { changedAt: "desc" } } },
    });
  },
  /** Ownership check built into the query: id AND userId. */
  findOwned(id: string, userId: string) {
    return prisma.application.findFirst({ where: { id, userId } });
  },
  findByJob(userId: string, jobId: string) {
    return prisma.application.findFirst({ where: { userId, jobId }, select: { id: true } });
  },
  /** Nested create runs in one implicit transaction: application + first history row. */
  create(data: NewApplication) {
    return prisma.application.create({
      data: { ...data, history: { create: { status: data.status, note: "Application added", changedAt: data.appliedAt } } },
    });
  },
  changeStatus(id: string, status: ApplicationStatus, note?: string) {
    return prisma.$transaction([
      prisma.application.update({ where: { id }, data: { status } }),
      prisma.applicationStatusHistory.create({ data: { applicationId: id, status, note: note || null } }),
    ]);
  },
  async countsByStatus(userId: string): Promise<Record<string, number>> {
    const rows = await prisma.application.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  },
  recent(userId: string, take = 4) {
    return prisma.application.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take });
  },
  jobIdsForUser(userId: string) {
    return prisma.application.findMany({ where: { userId, jobId: { not: null } }, select: { jobId: true }, take: 10 });
  },
};
