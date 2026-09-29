import { AppError } from "@/lib/errors";
import {
  isSavableStep, isWizardStep, stepPayloadSchemas, type SavableStep, type WizardStepName,
} from "@/lib/validations/resume";
import { resumeRepository } from "@/repositories/resume.repository";
import { userRepository } from "@/repositories/user.repository";
import type { ResumeSnapshot } from "@/services/ai/types";
import { emptyResumeData, type ResumeData } from "@/types/resume";

type FullResume = NonNullable<Awaited<ReturnType<typeof resumeRepository.findByUser>>>;

/** Prisma rows -> the shape the wizard UI uses. */
export function toResumeData(r: FullResume): ResumeData {
  return {
    personalInfo: {
      fullName: r.fullName, jobTitle: r.headline, email: r.email, phone: r.phone, location: r.location,
      github: r.githubUrl, linkedin: r.linkedinUrl, portfolio: r.portfolioUrl, summary: r.summary,
    },
    hasExperience: r.hasExperience === null ? null : r.hasExperience ? "yes" : "no",
    experience: r.experiences.filter((e) => e.kind === "WORK").map((e) => ({
      id: e.id, company: e.company, position: e.role, location: e.location, startDate: e.startDate, endDate: e.endDate, description: e.description,
    })),
    internship: r.experiences.filter((e) => e.kind === "INTERNSHIP").map((e) => ({
      id: e.id, position: e.role, company: e.company, department: e.department, location: e.location, startDate: e.startDate, endDate: e.endDate, description: e.description,
    })),
    education: r.education.map((e) => ({
      id: e.id, school: e.school, degree: e.degree, location: e.location, startDate: e.startDate, endDate: e.endDate, honors: e.honors, summary: e.description,
    })),
    skills: r.skills.map((s) => ({ id: s.id, name: s.skill.name, category: s.category })),
    projects: r.projects.map((p) => ({
      id: p.id, name: p.name, role: p.role, organization: p.organization, date: p.date, description: p.description, skillsUsed: p.technologies, url: p.url,
    })),
    certifications: r.certifications.map((c) => ({
      id: c.id, name: c.name, issuer: c.issuer, issueDate: c.issuedDate, expirationDate: c.expirationDate, credentialId: c.credentialId, credentialUrl: c.url,
    })),
    trainings: r.trainings.map((t) => ({ id: t.id, name: t.name, provider: t.provider, date: t.date, description: t.description })),
  };
}

export function computeResumeCompletion(d: ResumeData | null): number {
  if (!d) return 0;
  const p = d.personalInfo;
  const checks = [
    p.fullName, p.email, p.phone, p.location, p.jobTitle, p.summary.length >= 80,
    d.hasExperience === "no" || d.experience.length > 0 || d.internship.length > 0,
    d.education.length > 0, d.skills.length >= 5, d.projects.length > 0, d.certifications.length + d.trainings.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export const resumeService = {
  /** Saved resume, or a blank one prefilled from the account. */
  async getForEditor(userId: string): Promise<{ data: ResumeData; exists: boolean; lastStep: WizardStepName | null }> {
    const resume = await resumeRepository.findByUser(userId);
    if (!resume) {
      const user = await userRepository.findById(userId);
      const data = { ...emptyResumeData, personalInfo: { ...emptyResumeData.personalInfo, fullName: user?.name ?? "", email: user?.email ?? "" } };
      return { data, exists: false, lastStep: null };
    }
    return { data: toResumeData(resume), exists: true, lastStep: isWizardStep(resume.lastStep) ? resume.lastStep : null };
  },

  /**
   * Saves ONE wizard step. userId comes from the session (never the client);
   * the payload is validated with the schema for that step before touching the database.
   */
  async saveStep(userId: string, step: string, payload: unknown, nextStep: string | null) {
    if (!isSavableStep(step)) throw new AppError("Unknown resume step.");
    const last = isWizardStep(nextStep) ? nextStep : null;
    const parsed = stepPayloadSchemas[step as SavableStep].safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError(issue ? `${issue.message}${issue.path.length ? ` (${issue.path.join(" › ")})` : ""}` : "Please check the form.");
    }
    const v = parsed.data as never;
    switch (step as SavableStep) {
      case "personal-info": return resumeRepository.savePersonal(userId, v, last);
      case "experience-question": return resumeRepository.saveHasExperience(userId, v === null ? null : (v as string) === "yes", last);
      case "experience-entries": return resumeRepository.replaceExperiences(userId, v, last);
      case "internship": return resumeRepository.replaceInternships(userId, v, last);
      case "education": return resumeRepository.replaceEducation(userId, v, last);
      case "skills": return resumeRepository.replaceSkills(userId, v, last);
      case "projects": return resumeRepository.replaceProjects(userId, v, last);
      case "certifications": {
        const c = v as { certifications: never; trainings: never };
        return resumeRepository.replaceCertificationsAndTrainings(userId, c.certifications, c.trainings, last);
      }
    }
  },

  async setLastStep(userId: string, step: string) {
    if (isWizardStep(step)) await resumeRepository.setLastStep(userId, step);
  },

  remove(userId: string) {
    return resumeRepository.deleteByUser(userId);
  },

  /** Flat view used by the analyzer / ATS providers. Work + internships both count as experience. */
  async getSnapshot(userId: string): Promise<{ snapshot: ResumeSnapshot; resumeId: string } | null> {
    const resume = await resumeRepository.findByUser(userId);
    if (!resume) return null;
    return {
      resumeId: resume.id,
      snapshot: {
        fullName: resume.fullName, email: resume.email, phone: resume.phone, location: resume.location,
        headline: resume.headline, summary: resume.summary,
        skills: resume.skills.map((s) => s.skill.name),
        experiences: resume.experiences.map((e) => ({ role: e.role, company: e.company, description: e.description, startDate: e.startDate, endDate: e.endDate })),
        education: resume.education.map((e) => ({ school: e.school, degree: e.degree })),
        projects: resume.projects.map((p) => ({ name: p.name, description: p.description, technologies: p.technologies })),
        certifications: [...resume.certifications.map((c) => ({ name: c.name })), ...resume.trainings.map((t) => ({ name: t.name }))],
      },
    };
  },
};
