import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const since = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export const analysisRepository = {
  // ───── resume analyses ─────
  latestResumeAnalysis(userId: string) {
    return prisma.resumeAnalysis.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  },
  /** Ownership is part of the query: id AND userId. */
  findResumeAnalysisOwned(id: string, userId: string) {
    return prisma.resumeAnalysis.findFirst({ where: { id, userId } });
  },
  findResumeAnalysisByHash(userId: string, inputHash: string) {
    return prisma.resumeAnalysis.findFirst({ where: { userId, inputHash, provider: "gemini" }, orderBy: { createdAt: "desc" } });
  },
  listResumeAnalyses(userId: string, take = 12) {
    return prisma.resumeAnalysis.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take,
      select: { id: true, score: true, createdAt: true, sourceType: true, isDemo: true, details: true },
    });
  },
  countResumeAnalysesSince(userId: string, minutes: number) {
    return prisma.resumeAnalysis.count({ where: { userId, createdAt: { gte: since(minutes) } } });
  },
  createResumeAnalysis(data: Prisma.ResumeAnalysisUncheckedCreateInput) {
    return prisma.resumeAnalysis.create({ data });
  },

  // ───── ATS analyses ─────
  latestATS(userId: string, jobId?: string) {
    return prisma.aTSAnalysis.findFirst({ where: { userId, ...(jobId ? { jobId } : {}) }, orderBy: { createdAt: "desc" } });
  },
  findATSOwned(id: string, userId: string) {
    return prisma.aTSAnalysis.findFirst({ where: { id, userId } });
  },
  findATSByHash(userId: string, inputHash: string) {
    return prisma.aTSAnalysis.findFirst({ where: { userId, inputHash, provider: "gemini" }, orderBy: { createdAt: "desc" } });
  },
  listATSAnalyses(userId: string, take = 12) {
    return prisma.aTSAnalysis.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take,
      select: { id: true, score: true, createdAt: true, jobTitle: true, jobCompany: true, jobSource: true, isDemo: true },
    });
  },
  countATSAnalysesSince(userId: string, minutes: number) {
    return prisma.aTSAnalysis.count({ where: { userId, createdAt: { gte: since(minutes) } } });
  },
  createATS(data: Prisma.ATSAnalysisUncheckedCreateInput) {
    return prisma.aTSAnalysis.create({ data });
  },

  // ───── job matches ─────
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
