import { prisma } from "@/lib/prisma";

export const savedJobRepository = {
  listByUser(userId: string) {
    return prisma.savedJob.findMany({
      where: {
        userId,
      },
      orderBy: {
        savedAt: "desc",
      },
      include: {
        job: {
          include: {
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });
  },

  async idsForUser(userId: string): Promise<Set<string>> {
    const savedJobs = await prisma.savedJob.findMany({
      where: {
        userId,
      },
      select: {
        jobId: true,
      },
    });

    const jobIds = new Set<string>();

    for (const savedJob of savedJobs) {
      jobIds.add(savedJob.jobId);
    }

    return jobIds;
  },

  count(userId: string) {
    return prisma.savedJob.count({
      where: {
        userId,
      },
    });
  },

  save(userId: string, jobId: string) {
    return prisma.savedJob.upsert({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },

      create: {
        userId,
        jobId,
      },

      update: {},
    });
  },

  remove(userId: string, jobId: string) {
    return prisma.savedJob.deleteMany({
      where: {
        userId,
        jobId,
      },
    });
  },
};
