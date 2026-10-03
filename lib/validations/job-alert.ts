import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

export const jobAlertSchema = z
  .object({
    keyword: text(100),
    location: text(100),
    skills: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
    workArrangement: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional(),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]).optional(),
    experienceLevel: z.enum(["ENTRY", "JUNIOR", "MID", "SENIOR"]).optional(),
    minSalary: z.number().int().min(1).max(10_000_000).optional(),
  })
  .refine((d) => Boolean(d.keyword || d.location || d.skills.length || d.workArrangement || d.employmentType || d.experienceLevel || d.minSalary), {
    message: "Add at least one filter before creating an alert.",
  });

export type JobAlertInput = z.infer<typeof jobAlertSchema>;
