import type { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors";

import { analysisRepository } from "@/repositories/analysis.repository";

import { generateJson } from "./groq";

import type { ResolvedResume } from "./inputs";

import { RESUME_ANALYZER_SYSTEM, resumeUserMessage } from "./prompts";

import { resumeReportSchema, type ResumeReport } from "./schemas";

import {
  buildFacts,
  dedupeTerms,
  hasTerm,
  hashText,
  truncateForAI,
  type ResumeFacts,
} from "./text-utils";

export const RESUME_SCORE_WEIGHTS = {
  content: 0.2,
  experience: 0.2,
  skills: 0.15,
  projects: 0.1,
  education: 0.1,
  formatting: 0.1,
  atsReadiness: 0.15,
} as const;

const MAX_RUNS_PER_10_MIN = 8;

export type StoredResumeDetails = {
  report: ResumeReport;
  facts: ResumeFacts;
  truncated: boolean;
};

/**
 * The overall score is calculated in code from the
 * category scores, so it is always explainable.
 */
export function computeOverall(scores: ResumeReport["scores"]): number {
  return Math.round(
    Object.entries(RESUME_SCORE_WEIGHTS).reduce(
      (sum, [key, weight]) => sum + scores[key as keyof typeof scores] * weight,
      0,
    ),
  );
}

/**
 * Remove anything the AI claims is "found" but is
 * not actually present in the resume text.
 */
function verifyReport(report: ResumeReport, text: string): ResumeReport {
  return {
    ...report,

    overallScore: computeOverall(report.scores),

    keywords: {
      found: dedupeTerms(
        report.keywords.found.filter((keyword) => hasTerm(text, keyword)),
      ),

      suggested: dedupeTerms(
        report.keywords.suggested.filter((keyword) => !hasTerm(text, keyword)),
      ),
    },

    skills: {
      ...report.skills,

      found: dedupeTerms(
        report.skills.found.filter((skill) => hasTerm(text, skill)),
      ),
    },
  };
}

export const resumeAnalyzerService = {
  async analyze(
    userId: string,
    resume: ResolvedResume,
    opts: {
      force: boolean;
      stage: (stage: string) => void;
    },
  ) {
    const inputHash = hashText("resume-v1", resume.text);

    /*
     * If this exact resume was already analyzed,
     * return the existing result instead of making
     * another AI request.
     */
    if (!opts.force) {
      const existing = await analysisRepository.findResumeAnalysisByHash(
        userId,
        inputHash,
      );

      if (existing) {
        return {
          id: existing.id,
          cached: true,
        };
      }
    }

    /*
     * Prevent excessive AI requests.
     */
    if (
      (await analysisRepository.countResumeAnalysesSince(userId, 10)) >=
      MAX_RUNS_PER_10_MIN
    ) {
      throw new AppError(
        "You've run several analyses in the last few minutes. Please wait a bit before analyzing again.",
      );
    }

    /*
     * Tell the frontend that AI analysis has started.
     */
    opts.stage("analyzing");

    /*
     * Build deterministic resume facts before sending
     * the document to Groq.
     */
    const facts = buildFacts(resume.raw, resume.text);

    /*
     * Keep the AI input within a reasonable size.
     */
    const { text, truncated } = truncateForAI(resume.text);

    /*
     * Generate the structured resume report using Groq.
     */
    const { json, model } = await generateJson(
      RESUME_ANALYZER_SYSTEM,
      resumeUserMessage(text, facts, truncated),
    );

    /*
     * Validate the AI response with Zod.
     */
    const parsed = resumeReportSchema.safeParse(json);

    if (!parsed.success) {
      console.error(
        "Resume AI schema validation failed:",
        parsed.error.flatten(),
      );

      throw new AppError(
        "The AI answer didn't have the expected format. Please try again.",
      );
    }

    /*
     * Verify AI claims against the actual resume text.
     */
    const report = verifyReport(parsed.data, resume.text);

    /*
     * Don't save an unusable report.
     */
    if (Object.values(report.scores).every((score) => score === 0)) {
      throw new AppError(
        "The AI couldn't score this resume. Please try again.",
      );
    }

    /*
     * Save the final result.
     */
    opts.stage("saving");

    const priorities = [
      ...report.priorityImprovements.high,
      ...report.priorityImprovements.medium,
      ...report.priorityImprovements.low,
    ];

    const details: StoredResumeDetails = {
      report,
      facts,
      truncated,
    };

    const saved = await analysisRepository.createResumeAnalysis({
      userId,

      resumeId: resume.resumeId,

      score: report.overallScore,

      sections: Object.entries(report.scores).map(([label, score]) => ({
        label,
        score,
      })),

      strengths: report.strengths,

      weaknesses: report.weaknesses,

      suggestions: (priorities.length
        ? priorities
        : report.summary.suggestions
      ).slice(0, 8),

      keywordsFound: report.keywords.found,

      keywordsSuggested: report.keywords.suggested,

      /*
       * IMPORTANT:
       * This is now Groq, not Gemini.
       */
      provider: "groq",

      isDemo: false,

      model,

      sourceType: resume.source,

      inputHash,

      details: details as unknown as Prisma.InputJsonValue,
    });

    return {
      id: saved.id,
      cached: false,
    };
  },

  async getOwned(userId: string, id: string) {
    const row = await analysisRepository.findResumeAnalysisOwned(id, userId);

    if (!row) {
      return null;
    }

    return {
      row,
      details: (row.details ?? null) as StoredResumeDetails | null,
    };
  },

  history: (userId: string) => analysisRepository.listResumeAnalyses(userId),
};
