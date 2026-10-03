import { prisma } from "@/lib/prisma";

const jobSignalSelect = {
  employmentType: true,
  skills: { select: { skill: { select: { name: true } } } },
} as const;

/** What the user's saved jobs and applications say about their taste. Bounded, newest first, selective columns only. */
export const jobInteractionRepository = {
  async signals(userId: string) {
    const [saved, applied] = await Promise.all([
      prisma.savedJob.findMany({ where: { userId }, orderBy: { savedAt: "desc" }, take: 25, select: { job: { select: jobSignalSelect } } }),
      prisma.application.findMany({
        where: { userId, jobId: { not: null } },
        orderBy: { appliedAt: "desc" },
        take: 25,
        select: { jobId: true, job: { select: jobSignalSelect } },
      }),
    ]);
    const jobs = [...saved.map((s) => s.job), ...applied.flatMap((a) => (a.job ? [a.job] : []))];
    return {
      skills: [...new Set(jobs.flatMap((j) => j.skills.map((s) => s.skill.name)))],
      employmentTypes: [...new Set(jobs.map((j) => j.employmentType))],
      appliedJobIds: new Set(applied.flatMap((a) => (a.jobId ? [a.jobId] : []))),
    };
  },
};
