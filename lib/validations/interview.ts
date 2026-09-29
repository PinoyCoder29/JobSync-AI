import { z } from "zod";

export const startInterviewSchema = z.object({
  category: z.enum(["HR", "BEHAVIORAL", "TECHNICAL", "SITUATIONAL"]),
  jobRole: z.string().trim().min(2, "Enter the role you are preparing for").max(80),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
});

export const answerSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  answer: z.string().trim().min(15, "Write at least a couple of sentences").max(4000),
});
