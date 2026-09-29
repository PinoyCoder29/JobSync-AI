import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const analysisRepository = {
  latestResumeAnalysis(userId: string) {
    return prisma.resumeAnalysis.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  },
  createResumeAnalysis(data: Prisma.ResumeAnalysisUncheckedCreateInput) {
    return prisma.resumeAnalysis.create({ data });
  },
  latestATS(userId: string, jobId?: string) {
    return prisma.aTSAnalysis.findFirst({ where: { userId, ...(jobId ? { jobId } : {}) }, orderBy: { createdAt: "desc" } });
  },
  createATS(data: Prisma.ATSAnalysisUncheckedCreateInput) {
    return prisma.aTSAnalysis.create({ data });
  },
  matchesForUser(userId: string) {
    return prisma.jobMatch.findMany({ where: { userId } });
  },
  saveMatches(rows: { userId: string; jobId: string; overall: number; skills: number; experience: number; education: number; location: number }[]) {
    return prisma.$transaction(
      rows.map((r) =>
        prisma.jobMatch.upsert({
          where: { userId_jobId: { userId: r.userId, jobId: r.jobId } },
          create: r,
          update: { overall: r.overall, skills: r.skills, experience: r.experience, education: r.education, location: r.location },
        }),
      ),
    );
  },
};
