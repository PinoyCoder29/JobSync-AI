import { z } from "zod";
import { INTERVIEW_TYPE_KEYS } from "@/lib/interview-types";

export const MAX_ANSWER_CHARS = 3000;

export const startLiveSchema = z
  .object({
    type: z.enum(INTERVIEW_TYPE_KEYS),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    length: z.coerce.number().int().min(3).max(10).default(6),
    jobId: z.string().trim().min(1).max(60).optional(),
    jobDescription: z.string().trim().max(6000).optional(),
    role: z.string().trim().max(80).optional(),
  })
  .refine((v) => v.type !== "CUSTOM_JOB" || Boolean(v.jobId || v.jobDescription), { message: "Pick a job or paste a job description for a custom job interview.", path: ["jobId"] });

export const liveAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(60),
  answer: z.string().trim().min(2, "Say or type your answer first.").max(MAX_ANSWER_CHARS, `Keep answers under ${MAX_ANSWER_CHARS} characters.`).transform((v) => v.replace(/\u0000/g, "")),
});

export const liveIdSchema = z.string().trim().min(1).max(60);
