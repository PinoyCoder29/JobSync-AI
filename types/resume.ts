export interface PersonalInfo {
  github: string;
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  summary: string;
}
export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string;
  description: string;
}
export interface InternshipEntry {
  id: string;
  position: string;
  company: string;
  department?: string;
  location?: string;
  startDate: string;
  endDate: string;
  description: string;
}
export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  location?: string;
  startDate: string;
  endDate: string;
  honors?: string;
  summary?: string;
}
export interface ProjectEntry {
  id: string;
  name: string;
  role?: string;
  organization?: string;
  date?: string;
  description: string;
  skillsUsed?: string;
  url?: string;
}
export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}
export interface TrainingEntry {
  id: string;
  name: string;
  provider?: string;
  date?: string;
  description?: string;
}
export type SkillCategory = string;
export interface SkillEntry {
  id: string;
  name: string;
  category: SkillCategory;
}
export type HasExperience = "yes" | "no" | null;
export interface ResumeData {
  personalInfo: PersonalInfo;
  hasExperience: HasExperience;
  experience: ExperienceEntry[];
  internship: InternshipEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  trainings: TrainingEntry[];
}
export const emptyResumeData: ResumeData = {
  personalInfo: {
    github: "",
    fullName: "",
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    summary: "",
  },
  hasExperience: null,
  experience: [],
  internship: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  trainings: [],
};
export type WizardStep =
  | "personal-info"
  | "experience-question"
  | "experience-entries"
  | "internship"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "preview";
export const STEP_LABELS: Record<WizardStep, string> = {
  "personal-info": "Personal Info",
  "experience-question": "Experience",
  "experience-entries": "Work History",
  internship: "Internship",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  preview: "Preview & Download",
};
