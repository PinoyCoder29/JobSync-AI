import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { analysisRepository } from "@/repositories/analysis.repository";
import { generateJson } from "./groq";
import type { ResolvedJob, ResolvedResume } from "./inputs";
import { ATS_SYSTEM, atsUserMessage } from "./prompts";
import { atsReportSchema, type ATSReport } from "./schemas";
import {
  buildFacts,
  canonicalTerm,
  dedupeTerms,
  findKnownSkills,
  hasTerm,
  hashText,
  truncateForAI,
  type ResumeFacts,
} from "./text-utils";

export const ATS_SCORE_WEIGHTS = {
  keywordMatch: 0.3,
  skillsMatch: 0.3,
  experienceMatch: 0.2,
  educationMatch: 0.1,
  atsStructure: 0.1,
} as const;

const MAX_RUNS_PER_10_MIN = 8;

export type StoredATSDetails = {
  report: ATSReport;
  facts: ResumeFacts;
  truncated: boolean;
};

const ratio = (a: number, b: number) =>
  a + b === 0 ? 0 : Math.round((a / (a + b)) * 100);

/**
 * The AI proposes keyword lists; code then verifies them against
 * the real resume text.
 *
 * This makes sure a "matched" keyword is actually present
 * in the candidate's resume.
 */
function verifyReport(
  report: ATSReport,
  resumeText: string,
  jobSkills: string[],
): ATSReport {
  const inResume = (t: string) => hasTerm(resumeText, t);

  const keywordPool = dedupeTerms([
    ...report.matchedKeywords,
    ...report.missingKeywords,
  ]);

  const matchedKeywords = keywordPool.filter(inResume);
  const missingKeywords = keywordPool.filter((k) => !inResume(k));

  const skillPool = dedupeTerms([
    ...report.matchedSkills,
    ...report.missingSkills,
    ...jobSkills,
  ]);

  const matchedSkills = skillPool.filter(inResume);
  const missingSkills = skillPool.filter((s) => !inResume(s));

  const related = (list: string[], exclude: string[]) => {
    const skip = new Set(exclude.map((t) => canonicalTerm(t).toLowerCase()));

    return dedupeTerms(list).filter(
      (t) => !skip.has(canonicalTerm(t).toLowerCase()),
    );
  };

  const scores = {
    ...report.scores,

    keywordMatch: keywordPool.length
      ? ratio(matchedKeywords.length, missingKeywords.length)
      : report.scores.keywordMatch,

    skillsMatch: skillPool.length
      ? ratio(matchedSkills.length, missingSkills.length)
      : report.scores.skillsMatch,
  };

  const overallScore = Math.round(
    Object.entries(ATS_SCORE_WEIGHTS).reduce(
      (sum, [k, w]) => sum + scores[k as keyof typeof scores] * w,
      0,
    ),
  );

  return {
    ...report,
    scores,
    overallScore,

    matchedKeywords,
    missingKeywords,

    relatedKeywords: related(report.relatedKeywords, [
      ...matchedKeywords,
      ...missingKeywords,
    ]),

    matchedSkills,
    missingSkills,

    relatedSkills: related(report.relatedSkills, [
      ...matchedSkills,
      ...missingSkills,
    ]),
  };
}

export const atsCheckerService = {
  async analyze(
    userId: string,
    resume: ResolvedResume,
    job: ResolvedJob,
    opts: {
      force: boolean;
      stage: (s: string) => void;
    },
  ) {
    const inputHash = hashText("ats-v1", resume.text, job.text);

    /*
     * Return the previous analysis when the resume/job
     * combination has not changed.
     */
    if (!opts.force) {
      const existing = await analysisRepository.findATSByHash(
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
      (await analysisRepository.countATSAnalysesSince(userId, 10)) >=
      MAX_RUNS_PER_10_MIN
    ) {
      throw new AppError(
        "You've run several checks in the last few minutes. Please wait a bit before checking again.",
      );
    }

    opts.stage("comparing");

    const facts = buildFacts(resume.raw, resume.text);

    const jobSkills = findKnownSkills(job.text);

    const resumeTrunc = truncateForAI(resume.text);

    const jobTrunc = truncateForAI(job.text);

    /*
     * GROQ AI
     *
     * This now uses:
     * services/analysis/groq.ts
     *
     * The configured model is:
     * openai/gpt-oss-120b
     */
    const { json, model } = await generateJson(
      ATS_SYSTEM,
      atsUserMessage(
        resumeTrunc.text,
        jobTrunc.text,
        facts,
        jobSkills,
        resumeTrunc.truncated || jobTrunc.truncated,
      ),
    );

    const parsed = atsReportSchema.safeParse(json);

    if (!parsed.success) {
      throw new AppError(
        "The AI answer didn't have the expected format. Please try again.",
      );
    }

    /*
     * Verify the AI's keyword/skill claims against
     * the actual resume text.
     */
    const report = verifyReport(parsed.data, resume.text, jobSkills);

    if (Object.values(report.scores).every((s) => s === 0)) {
      throw new AppError(
        "The AI couldn't compare these documents. Please try again.",
      );
    }

    opts.stage("saving");

    const title = job.title || report.job.title;

    const company = job.company || report.job.company;

    const details: StoredATSDetails = {
      report: {
        ...report,
        job: {
          title,
          company,
        },
      },
      facts,
      truncated: resumeTrunc.truncated || jobTrunc.truncated,
    };

    const saved = await analysisRepository.createATS({
      userId,
      resumeId: resume.resumeId,
      jobId: job.jobId,

      score: report.overallScore,

      matchedKeywords: report.matchedKeywords,

      missingKeywords: report.missingKeywords,

      checks: report.atsChecks,

      recommendations: report.recommendations,

      /*
       * IMPORTANT:
       * ATS is now using Groq.
       */
      provider: "groq",

      isDemo: false,

      model,

      details: details as unknown as Prisma.InputJsonValue,

      jobTitle: title || null,
      jobCompany: company || null,

      resumeSource: resume.source,
      jobSource: job.source,

      inputHash,
    });

    return {
      id: saved.id,
      cached: false,
    };
  },

  async getOwned(userId: string, id: string) {
    const row = await analysisRepository.findATSOwned(id, userId);

    if (!row) {
      return null;
    }

    return {
      row,
      details: (row.details ?? null) as StoredATSDetails | null,
    };
  },

  history: (userId: string) => analysisRepository.listATSAnalyses(userId),
};
