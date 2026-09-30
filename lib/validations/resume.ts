import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).default("");
const required = (max: number, msg: string) => z.string().trim().min(1, msg).max(max);
const link = z.string().trim().max(200).default("");

export const WIZARD_STEPS = [
  "personal-info", "experience-question", "experience-entries", "internship",
  "education", "skills", "projects", "certifications", "preview",
] as const;
export type WizardStepName = (typeof WIZARD_STEPS)[number];

export const personalInfoSchema = z.object({
  fullName: required(100, "Full name is required").min(2, "Full name is required"),
  jobTitle: text(120),
  email: z.string().trim().email("Enter a valid email address"),
  phone: text(40),
  location: text(120),
  github: link,
  linkedin: link,
  portfolio: link,
  summary: text(1500),
});

export const experienceSchema = z.object({
  company: required(120, "Company is required"),
  position: required(120, "Position is required"),
  location: text(120),
  startDate: text(20),
  endDate: text(20),
  description: text(2500),
});

export const internshipSchema = z.object({
  position: required(120, "Internship position is required"),
  company: required(120, "Company is required"),
  department: text(120),
  location: text(120),
  startDate: text(20),
  endDate: text(20),
  description: text(2500),
});

export const educationSchema = z.object({
  school: required(150, "School is required"),
  degree: required(150, "Degree is required"),
  location: text(120),
  startDate: text(20),
  endDate: text(20),
  honors: text(150),
  summary: text(1500),
});

export const skillSchema = z.object({ name: required(60, "Skill name is required"), category: text(60) });

export const projectSchema = z.object({
  name: required(120, "Project name is required"),
  role: text(120),
  organization: text(120),
  date: text(40),
  description: text(2000),
  skillsUsed: text(300),
  url: link,
});

export const certificationSchema = z.object({
  name: required(150, "Certification name is required"),
  issuer: text(120),
  issueDate: text(20),
  expirationDate: text(20),
  credentialId: text(80),
  credentialUrl: link,
});

export const trainingSchema = z.object({
  name: required(150, "Training name is required"),
  provider: text(120),
  date: text(40),
  description: text(1500),
});

/** What the client is allowed to send for each wizard step. Everything is re-validated on the server. */
export const stepPayloadSchemas = {
  "personal-info": personalInfoSchema,
  "experience-question": z.enum(["yes", "no"]).nullable(),
  "experience-entries": z.array(experienceSchema).max(15),
  internship: z.array(internshipSchema).max(15),
  education: z.array(educationSchema).max(10),
  skills: z.array(skillSchema).max(60),
  projects: z.array(projectSchema).max(12),
  certifications: z.object({ certifications: z.array(certificationSchema).max(15), trainings: z.array(trainingSchema).max(15) }),
} as const;

export type SavableStep = keyof typeof stepPayloadSchemas;
export const isWizardStep = (v: unknown): v is WizardStepName => typeof v === "string" && (WIZARD_STEPS as readonly string[]).includes(v);
export const isSavableStep = (v: unknown): v is SavableStep => typeof v === "string" && v in stepPayloadSchemas;
