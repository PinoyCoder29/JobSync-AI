import { z } from "zod";

export const APPLICATION_STATUSES = ["APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(120),
  position: z.string().trim().min(1, "Position is required").max(120),
  status: z.enum(APPLICATION_STATUSES).default("APPLIED"),
  appliedAt: z.coerce.date({ errorMap: () => ({ message: "Choose the date you applied" }) }),
  nextStep: optionalText(200),
  notes: optionalText(2000),
  jobUrl: z.string().trim().url("Enter a full URL").or(z.literal("")).optional(),
});

export const changeStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(APPLICATION_STATUSES),
  note: optionalText(500),
});
