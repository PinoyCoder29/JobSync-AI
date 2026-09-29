import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);

export const resumeSchema = z.object({
  fullName: str(100).min(2, "Full name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: str(40).default(""),
  location: str(120).default(""),
  headline: str(120).default(""),
  summary: str(1500).default(""),
  experiences: z
    .array(
      z.object({
        company: str(120).min(1, "Company is required"),
        role: str(120).min(1, "Role is required"),
        location: str(120).default(""),
        startDate: str(20).min(1, "Start date is required"),
        endDate: str(20).default(""),
        description: str(2000).default(""),
      }),
    )
    .max(15),
  education: z
    .array(
      z.object({
        school: str(150).min(1, "School is required"),
        degree: str(150).min(1, "Degree is required"),
        field: str(150).default(""),
        startDate: str(20).default(""),
        endDate: str(20).default(""),
        description: str(1000).default(""),
      }),
    )
    .max(10),
  projects: z
    .array(
      z.object({
        name: str(120).min(1, "Project name is required"),
        url: z.string().trim().url("Project link must be a full URL").or(z.literal("")).default(""),
        description: str(1500).default(""),
        technologies: str(300).default(""),
      }),
    )
    .max(12),
  certifications: z
    .array(
      z.object({
        name: str(150).min(1, "Certification name is required"),
        issuer: str(120).default(""),
        issuedDate: str(20).default(""),
        url: z.string().trim().url("Credential link must be a full URL").or(z.literal("")).default(""),
      }),
    )
    .max(15),
  skills: z.array(str(50).min(1)).max(50),
});

export type ResumeInput = z.infer<typeof resumeSchema>;
