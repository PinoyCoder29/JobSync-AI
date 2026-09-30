import { z } from "zod";

/**
 * Zod schemas for what the AI must return. They are deliberately forgiving (defaults, coercion):
 * a model that forgets one optional field should not break the whole page, but nothing outside
 * this shape ever reaches the database or the UI.
 */
const str = z.string().catch("");
const list = z.array(z.string()).catch([]);
const score = z.coerce.number().catch(0).transform((n) => Math.max(0, Math.min(100, Math.round(n))));

const rewrite = z.preprocess(
  (v) => (typeof v === "string" ? { original: "", improved: v, note: "" } : v),
  z.object({ original: str, improved: str, note: str }),
);
const rewrites = z.array(rewrite).catch([]);

const issueBlock = z.object({ issues: list, suggestions: list }).catch({ issues: [], suggestions: [] });

export const resumeReportSchema = z.object({
  overallScore: score,
  scores: z.object({
    content: score, experience: score, skills: score, projects: score, education: score, formatting: score, atsReadiness: score,
  }).catch({ content: 0, experience: 0, skills: 0, projects: 0, education: 0, formatting: 0, atsReadiness: 0 }),
  strengths: list,
  weaknesses: list,
  missingInformation: z.object({ important: list, optional: list }).catch({ important: [], optional: [] }),
  summary: z.object({ issues: list, suggestions: list, rewrite: str }).catch({ issues: [], suggestions: [], rewrite: "" }),
  experience: z.object({ issues: list, suggestions: list, rewrites }).catch({ issues: [], suggestions: [], rewrites: [] }),
  skills: z.object({ found: list, suggestions: list, unsupported: list }).catch({ found: [], suggestions: [], unsupported: [] }),
  projects: z.object({ issues: list, suggestions: list, rewrites }).catch({ issues: [], suggestions: [], rewrites: [] }),
  education: issueBlock,
  certifications: issueBlock,
  grammar: z.object({
    issues: z.array(z.object({ original: str, problem: str, correction: str })).catch([]),
  }).catch({ issues: [] }),
  keywords: z.object({ found: list, suggested: list }).catch({ found: [], suggested: [] }),
  priorityImprovements: z.object({ high: list, medium: list, low: list }).catch({ high: [], medium: [], low: [] }),
});
export type ResumeReport = z.infer<typeof resumeReportSchema>;

const atsCheck = z.preprocess(
  (v) => (typeof v === "string" ? { label: v, status: "warning", detail: "" } : v),
  z.object({
    label: str,
    status: z.enum(["pass", "warning", "concern"]).catch("warning"),
    detail: str,
  }),
);
const resumeChange = z.preprocess(
  (v) => (typeof v === "string" ? { section: "", suggestion: v } : v),
  z.object({ section: str, suggestion: str }),
);
const matchBlock = z.object({ matches: list, gaps: list }).catch({ matches: [], gaps: [] });

export const atsReportSchema = z.object({
  overallScore: score,
  scores: z.object({ keywordMatch: score, skillsMatch: score, experienceMatch: score, educationMatch: score, atsStructure: score })
    .catch({ keywordMatch: 0, skillsMatch: 0, experienceMatch: 0, educationMatch: 0, atsStructure: 0 }),
  job: z.object({ title: str, company: str }).catch({ title: "", company: "" }),
  matchedKeywords: list,
  missingKeywords: list,
  relatedKeywords: list,
  matchedSkills: list,
  missingSkills: list,
  relatedSkills: list,
  unsupportedSkills: list,
  experienceMatch: matchBlock,
  educationMatch: matchBlock,
  atsChecks: z.array(atsCheck).catch([]),
  recommendations: list,
  resumeChanges: z.array(resumeChange).catch([]),
});
export type ATSReport = z.infer<typeof atsReportSchema>;
