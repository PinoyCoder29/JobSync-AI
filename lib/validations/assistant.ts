import { z } from "zod";

export const ASSISTANT_MAX_MESSAGE = 1000;
export const ASSISTANT_MAX_HISTORY = 8;

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1, "Ask a question first.").max(ASSISTANT_MAX_MESSAGE, `Keep questions under ${ASSISTANT_MAX_MESSAGE} characters.`).transform((v) => v.replace(/\u0000/g, "")),
  // Earlier turns come from the browser, so they are length-capped and only ever treated as untrusted text.
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) }))
    .max(ASSISTANT_MAX_HISTORY)
    .default([]),
});
export type AssistantChatInput = z.infer<typeof assistantChatSchema>;

/** The AI may suggest opening one of OUR tools; it can never invent a link. */
export const ASSISTANT_TOOLS = {
  RESUME_ANALYZER: { href: "/resume-analyzer", label: "Open Resume Analyzer" },
  ATS_CHECKER: { href: "/ats-checker", label: "Open ATS Checker" },
  SKILL_ANALYSIS: { href: "/skill-analysis", label: "Open Skill Gap Analysis" },
  INTERVIEW: { href: "/interview", label: "Start interview practice" },
  JOBS: { href: "/jobs", label: "Browse jobs" },
  RESUME_BUILDER: { href: "/resume-builder", label: "Open Resume Builder" },
} as const;
export type AssistantToolKey = keyof typeof ASSISTANT_TOOLS;

export const assistantReplySchema = z.object({
  reply: z.string().min(1).max(4000),
  followUps: z.array(z.string().max(120)).max(3).default([]),
  tool: z.enum(Object.keys(ASSISTANT_TOOLS) as [AssistantToolKey, ...AssistantToolKey[]]).nullable().default(null),
});
