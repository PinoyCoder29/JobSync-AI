import { prisma } from "@/lib/prisma";
import type { ResumeInput } from "@/lib/validations/resume";

const ordered = { orderBy: { sortOrder: "asc" as const } };

export const resumeRepository = {
  findByUser(userId: string) {
    return prisma.resume.findUnique({
      where: { userId },
      include: {
        experiences: ordered,
        education: ordered,
        projects: ordered,
        certifications: ordered,
        skills: { ...ordered, include: { skill: true } },
      },
    });
  },

  /** Replaces the whole resume in ONE transaction so a failure never leaves a half-saved resume. */
  replace(userId: string, input: ResumeInput) {
    return prisma.$transaction(
      async (tx) => {
        const base = {
          fullName: input.fullName, email: input.email, phone: input.phone,
          location: input.location, headline: input.headline, summary: input.summary,
        };
        const resume = await tx.resume.upsert({ where: { userId }, create: { userId, ...base }, update: base });
        const resumeId = resume.id;

        await tx.resumeExperience.deleteMany({ where: { resumeId } });
        await tx.resumeEducation.deleteMany({ where: { resumeId } });
        await tx.resumeProject.deleteMany({ where: { resumeId } });
        await tx.resumeCertification.deleteMany({ where: { resumeId } });
        await tx.resumeSkill.deleteMany({ where: { resumeId } });

        await tx.resumeExperience.createMany({ data: input.experiences.map((e, i) => ({ ...e, resumeId, sortOrder: i })) });
        await tx.resumeEducation.createMany({ data: input.education.map((e, i) => ({ ...e, resumeId, sortOrder: i })) });
        await tx.resumeProject.createMany({ data: input.projects.map((p, i) => ({ ...p, resumeId, sortOrder: i })) });
        await tx.resumeCertification.createMany({ data: input.certifications.map((c, i) => ({ ...c, resumeId, sortOrder: i })) });

        const names = [...new Map(input.skills.map((s) => [s.toLowerCase(), s])).values()];
        const skillRows = [];
        for (const name of names) skillRows.push(await tx.skill.upsert({ where: { name }, create: { name }, update: {} }));
        await tx.resumeSkill.createMany({ data: skillRows.map((s, i) => ({ resumeId, skillId: s.id, sortOrder: i })) });

        return resume;
      },
      { timeout: 20_000 },
    );
  },

  /** Deleting the resume cascades to every section (see onDelete: Cascade in the schema). */
  deleteByUser(userId: string) {
    return prisma.resume.deleteMany({ where: { userId } });
  },
};
