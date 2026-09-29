import { prisma } from "@/lib/prisma";

export const savedJobRepository = {
  listByUser(userId: string) {
    return prisma.savedJob.findMany({
      where: { userId },
      orderBy: { savedAt: "desc" },
      include: { job: { include: { skills: { include: { skill: true } } } } },
    });
  },
  async idsForUser(userId: string): Promise<Set<string>> {
    const rows = await prisma.savedJob.findMany({ where: { userId }, select: { jobId: true } });
    return new Set(rows.map((r) => r.jobId));
  },
  count(userId: string) {
    return prisma.savedJob.count({ where: { userId } });
  },
  /** Idempotent: the @@unique([userId, jobId]) constraint prevents duplicates. */
  save(userId: string, jobId: string) {
    return prisma.savedJob.upsert({ where: { userId_jobId: { userId, jobId } }, create: { userId, jobId }, update: {} });
  },
  remove(userId: string, jobId: string) {
    return prisma.savedJob.deleteMany({ where: { userId, jobId } });
  },
};
