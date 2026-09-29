import { resumeRepository } from "@/repositories/resume.repository";
import { userRepository } from "@/repositories/user.repository";
import type { ResumeInput } from "@/lib/validations/resume";
import type { ResumeSnapshot } from "@/services/ai/types";

export function emptyResume(name = "", email = ""): ResumeInput {
  return { fullName: name, email, phone: "", location: "", headline: "", summary: "", experiences: [], education: [], projects: [], certifications: [], skills: [] };
}

export function computeResumeCompletion(r: ResumeInput | null) {
  if (!r) return 0;
  const checks = [
    r.fullName, r.email, r.phone, r.location, r.headline, r.summary.length >= 80,
    r.experiences.length > 0, r.education.length > 0, r.skills.length >= 5, r.projects.length > 0, r.certifications.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export const resumeService = {
  /** Returns the saved resume, or a blank one prefilled from the account. */
  async getForEditor(userId: string): Promise<{ data: ResumeInput; exists: boolean }> {
    const resume = await resumeRepository.findByUser(userId);
    if (!resume) {
      const user = await userRepository.findById(userId);
      return { data: emptyResume(user?.name ?? "", user?.email ?? ""), exists: false };
    }
    return {
      exists: true,
      data: {
        fullName: resume.fullName, email: resume.email, phone: resume.phone, location: resume.location,
        headline: resume.headline, summary: resume.summary,
        experiences: resume.experiences.map(({ company, role, location, startDate, endDate, description }) => ({ company, role, location, startDate, endDate, description })),
        education: resume.education.map(({ school, degree, field, startDate, endDate, description }) => ({ school, degree, field, startDate, endDate, description })),
        projects: resume.projects.map(({ name, url, description, technologies }) => ({ name, url, description, technologies })),
        certifications: resume.certifications.map(({ name, issuer, issuedDate, url }) => ({ name, issuer, issuedDate, url })),
        skills: resume.skills.map((s) => s.skill.name),
      },
    };
  },

  /** userId always comes from the session, so a user can only ever write their own resume. */
  save(userId: string, input: ResumeInput) {
    return resumeRepository.replace(userId, input);
  },

  remove(userId: string) {
    return resumeRepository.deleteByUser(userId);
  },

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
        certifications: resume.certifications.map((c) => ({ name: c.name })),
      },
    };
  },
};
