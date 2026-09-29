import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type {
  certificationSchema, educationSchema, experienceSchema, internshipSchema, personalInfoSchema, projectSchema, skillSchema, trainingSchema,
} from "@/lib/validations/resume";

type Tx = Prisma.TransactionClient;
const ordered = { orderBy: { sortOrder: "asc" as const } };
const TX_OPTS = { timeout: 15_000 };

/** Creates the user's resume row on first save (prefilled from the account), then runs `work` in the same transaction. */
async function withResume(userId: string, lastStep: string | null, work: (tx: Tx, resumeId: string) => Promise<void>) {
  return prisma.$transaction(async (tx) => {
    let resume = await tx.resume.findUnique({ where: { userId }, select: { id: true } });
    if (!resume) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      resume = await tx.resume.create({ data: { userId, fullName: user?.name ?? "", email: user?.email ?? "" }, select: { id: true } });
    }
    await work(tx, resume.id);
    if (lastStep) await tx.resume.update({ where: { id: resume.id }, data: { lastStep } });
  }, TX_OPTS);
}

export const resumeRepository = {
  findByUser(userId: string) {
    return prisma.resume.findUnique({
      where: { userId },
      include: {
        experiences: ordered, education: ordered, projects: ordered, certifications: ordered, trainings: ordered,
        skills: { ...ordered, include: { skill: true } },
      },
    });
  },

  savePersonal(userId: string, p: z.infer<typeof personalInfoSchema>, lastStep: string | null) {
    return withResume(userId, lastStep, async (tx, id) => {
      await tx.resume.update({
        where: { id },
        data: { fullName: p.fullName, headline: p.jobTitle, email: p.email, phone: p.phone, location: p.location, githubUrl: p.github, linkedinUrl: p.linkedin, portfolioUrl: p.portfolio, summary: p.summary },
      });
    });
  },

  saveHasExperience(userId: string, value: boolean | null, lastStep: string | null) {
    return withResume(userId, lastStep, async (tx, id) => {
      await tx.resume.update({ where: { id }, data: { hasExperience: value } });
    });
  },

  replaceExperiences(userId: string, items: z.infer<typeof experienceSchema>[], lastStep: string | null) {
    return withResume(userId, lastStep, async (tx, resumeId) => {
      await tx.resumeExperience.deleteMany({ where: { resumeId, kind: "WORK" } });
      await tx.resumeExperience.createMany({
        data: items.map((e, i) => ({ resumeId, kind: "WORK" as const, company: e.company, role: e.position, location: e.location, startDate: e.startDate, endDate: e.endDate, description: e.description, sortOrder: i })),
      });
    });
  },

  replaceInternships(userId: string, items: z.infer<typeof internshipSchema>[], lastStep: string | null) {
    return withResume(userId, lastStep, async (tx, resumeId) => {
      await tx.resumeExperience.deleteMany({ where: { resumeId, kind: "INTERNSHIP" } });
      await tx.resumeExperience.createMany({
        data: items.map((e, i) => ({ resumeId, kind: "INTERNSHIP" as const, company: e.company, role: e.position, department: e.department, location: e.location, startDate: e.startDate, endDate: e.endDate, description: e.description, sortOrder: i })),
      });
    });
  },

  replaceEducation(userId: string, items: z.infer<typeof educationSchema>[], lastStep: string | null) {
    return withResume(userId, lastStep, async (tx, resumeId) => {
      await tx.resumeEducation.deleteMany({ where: { resumeId } });
      await tx.resumeEducation.createMany({
        data: items.map((e, i) => ({ resumeId, school: e.school, degree: e.degree, location: e.location, honors: e.honors, startDate: e.startDate, endDate: e.endDate, description: e.summary, sortOrder: i })),
      });
    });
  },

  replaceProjects(userId: string, items: z.infer<typeof projectSchema>[], lastStep: string | null) {
    return withResume(userId, lastStep, async (tx, resumeId) => {
      await tx.resumeProject.deleteMany({ where: { resumeId } });
      await tx.resumeProject.createMany({
        data: items.map((p, i) => ({ resumeId, name: p.name, role: p.role, organization: p.organization, date: p.date, url: p.url, description: p.description, technologies: p.skillsUsed, sortOrder: i })),
      });
    });
  },

  replaceCertificationsAndTrainings(userId: string, certs: z.infer<typeof certificationSchema>[], trainings: z.infer<typeof trainingSchema>[], lastStep: string | null) {
    return withResume(userId, lastStep, async (tx, resumeId) => {
      await tx.resumeCertification.deleteMany({ where: { resumeId } });
      await tx.resumeTraining.deleteMany({ where: { resumeId } });
      await tx.resumeCertification.createMany({
        data: certs.map((c, i) => ({ resumeId, name: c.name, issuer: c.issuer, issuedDate: c.issueDate, expirationDate: c.expirationDate, credentialId: c.credentialId, url: c.credentialUrl, sortOrder: i })),
      });
      await tx.resumeTraining.createMany({
        data: trainings.map((t, i) => ({ resumeId, name: t.name, provider: t.provider, date: t.date, description: t.description, sortOrder: i })),
      });
    });
  },

  replaceSkills(userId: string, items: z.infer<typeof skillSchema>[], lastStep: string | null) {
    return withResume(userId, lastStep, async (tx, resumeId) => {
      await tx.resumeSkill.deleteMany({ where: { resumeId } });
      const unique = [...new Map(items.map((s) => [s.name.toLowerCase(), s])).values()];
      const rows: { resumeId: string; skillId: string; category: string; sortOrder: number }[] = [];
      for (const [i, s] of unique.entries()) {
        const skill = await tx.skill.upsert({ where: { name: s.name }, create: { name: s.name }, update: {} });
        rows.push({ resumeId, skillId: skill.id, category: s.category || "Other", sortOrder: i });
      }
      await tx.resumeSkill.createMany({ data: rows });
    });
  },

  setLastStep(userId: string, lastStep: string) {
    return prisma.resume.updateMany({ where: { userId }, data: { lastStep } });
  },

  /** Deleting the resume cascades to every section (experiences, education, projects, certifications, trainings, skills). */
  deleteByUser(userId: string) {
    return prisma.resume.deleteMany({ where: { userId } });
  },
};
