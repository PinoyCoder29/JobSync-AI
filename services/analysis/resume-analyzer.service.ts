import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { analysisRepository } from "@/repositories/analysis.repository";
import { generateJson } from "./gemini";
import type { ResolvedResume } from "./inputs";
import { RESUME_ANALYZER_SYSTEM, resumeUserMessage } from "./prompts";
import { resumeReportSchema, type ResumeReport } from "./schemas";
import { buildFacts, dedupeTerms, hasTerm, hashText, truncateForAI, type ResumeFacts } from "./text-utils";

export const RESUME_SCORE_WEIGHTS = { content: 0.2, experience: 0.2, skills: 0.15, projects: 0.1, education: 0.1, formatting: 0.1, atsReadiness: 0.15 } as const;
const MAX_RUNS_PER_10_MIN = 8;

export type StoredResumeDetails = { report: ResumeReport; facts: ResumeFacts; truncated: boolean };

/** The overall score is calculated in code from the category scores, so it is always explainable. */
export function computeOverall(scores: ResumeReport["scores"]): number {
  return Math.round(Object.entries(RESUME_SCORE_WEIGHTS).reduce((sum, [k, w]) => sum + scores[k as keyof typeof scores] * w, 0));
}

/** Remove anything the AI claims is "found" but is not actually in the text. */
function verifyReport(report: ResumeReport, text: string): ResumeReport {
  return {
    ...report,
    overallScore: computeOverall(report.scores),
    keywords: { found: dedupeTerms(report.keywords.found.filter((k) => hasTerm(text, k))), suggested: dedupeTerms(report.keywords.suggested.filter((k) => !hasTerm(text, k))) },
    skills: { ...report.skills, found: dedupeTerms(report.skills.found.filter((k) => hasTerm(text, k))) },
  };
}

export const resumeAnalyzerService = {
  async analyze(userId: string, resume: ResolvedResume, opts: { force: boolean; stage: (s: string) => void }) {
    const inputHash = hashText("resume-v1", resume.text);

    // Same text already analysed by the AI? Show that instead of paying for another call.
    if (!opts.force) {
      const existing = await analysisRepository.findResumeAnalysisByHash(userId, inputHash);
      if (existing) return { id: existing.id, cached: true };
    }

    if ((await analysisRepository.countResumeAnalysesSince(userId, 10)) >= MAX_RUNS_PER_10_MIN) {
      throw new AppError("You've run several analyses in the last few minutes. Please wait a bit before analyzing again.");
    }

    opts.stage("analyzing");
    const facts = buildFacts(resume.raw, resume.text);
    const { text, truncated } = truncateForAI(resume.text);
    const { json, model } = await generateJson(RESUME_ANALYZER_SYSTEM, resumeUserMessage(text, facts, truncated));

    const parsed = resumeReportSchema.safeParse(json);
    if (!parsed.success) throw new AppError("The AI answer didn't have the expected format. Please try again.");
    const report = verifyReport(parsed.data, resume.text);
    if (Object.values(report.scores).every((s) => s === 0)) throw new AppError("The AI couldn't score this resume. Please try again.");

    opts.stage("saving");
    const priorities = [...report.priorityImprovements.high, ...report.priorityImprovements.medium, ...report.priorityImprovements.low];
    const details: StoredResumeDetails = { report, facts, truncated };
    const saved = await analysisRepository.createResumeAnalysis({
      userId,
      resumeId: resume.resumeId,
      score: report.overallScore,
      sections: Object.entries(report.scores).map(([label, score]) => ({ label, score })),
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      suggestions: (priorities.length ? priorities : report.summary.suggestions).slice(0, 8),
      keywordsFound: report.keywords.found,
      keywordsSuggested: report.keywords.suggested,
      provider: "gemini",
      isDemo: false,
      model,
      sourceType: resume.source,
      inputHash,
      details: details as unknown as Prisma.InputJsonValue,
    });
    return { id: saved.id, cached: false };
  },

  async getOwned(userId: string, id: string) {
    const row = await analysisRepository.findResumeAnalysisOwned(id, userId);
    if (!row) return null;
    return { row, details: (row.details ?? null) as StoredResumeDetails | null };
  },

  history: (userId: string) => analysisRepository.listResumeAnalyses(userId),
};
