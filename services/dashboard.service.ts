import { analysisRepository } from "@/repositories/analysis.repository";
import { applicationRepository } from "@/repositories/application.repository";
import { interviewRepository } from "@/repositories/interview.repository";
import { jobRepository } from "@/repositories/job.repository";
import { savedJobRepository } from "@/repositories/saved-job.repository";

import type { JobListItem } from "@/types";

import { analysisService } from "./analysis.service";
import { jobMatchService } from "./job-match.service";
import { profileService } from "./profile.service";
import { computeResumeCompletion, resumeService } from "./resume.service";

export const dashboardService = {
  async get(userId: string) {
    const [
      profile,
      resume,
      counts,
      recent,
      savedCount,
      interviewCount,
      resumeAnalysis,
      ats,
      jobs,
      savedIds,
      skills,
    ] = await Promise.all([
      profileService.get(userId),

      resumeService.getForEditor(userId),

      applicationRepository.countsByStatus(userId),

      applicationRepository.recent(userId, 4),

      savedJobRepository.count(userId),

      interviewRepository.count(userId),

      analysisRepository.latestResumeAnalysis(userId),

      analysisRepository.latestATS(userId),

      jobRepository.listActive(50),

      savedJobRepository.idsForUser(userId),

      analysisService.skillAnalysis(userId),
    ]);

    /* =====================================================
       JOB MATCHING
    ===================================================== */

    const matches = await jobMatchService.forUser(userId, jobs, {
      persist: true,
    });

    /* =====================================================
       RECOMMENDED JOBS
    ===================================================== */

    const recommended: JobListItem[] = jobs
      .map((j: (typeof jobs)[number]) => ({
        ...j,

        match: matches.get(j.id)?.overall ?? 0,

        saved: savedIds.has(j.id),
      }))
      .sort((a: JobListItem, b: JobListItem) => (b.match ?? 0) - (a.match ?? 0))
      .slice(0, 3);

    /* =====================================================
       RESUME COMPLETION
    ===================================================== */

    const resumeCompletion = resume.exists
      ? computeResumeCompletion(resume.data)
      : 0;

    /* =====================================================
       TOTAL APPLICATIONS
    ===================================================== */

    const totalApplications = Object.values(counts).reduce(
      (total, count) => total + count,
      0,
    );

    /* =====================================================
       READINESS
    ===================================================== */

    const readinessParts = [
      profile.completion.percent,
      resumeCompletion,
      resumeAnalysis?.score,
      ats?.score,
    ].filter((n): n is number => typeof n === "number");

    const readiness = readinessParts.length
      ? Math.round(
          readinessParts.reduce((total, value) => total + value, 0) /
            readinessParts.length,
        )
      : 0;

    /* =====================================================
       RETURN DASHBOARD DATA
    ===================================================== */

    return {
      name: profile.user?.name ?? "there",

      profileCompletion: profile.completion,

      resumeCompletion,

      resumeScore: resumeAnalysis?.score ?? null,

      atsScore: ats?.score ?? null,

      readiness,

      totalApplications,

      counts,

      interviewApplications: counts["INTERVIEW"] ?? 0,

      practiceSessions: interviewCount,

      savedCount,

      recentApplications: recent,

      recommended,

      skills: {
        strongest: skills.strongest,

        gaps: skills.gaps.slice(0, 4),

        coverage: skills.coverage,
      },

      resumeSuggestions: resumeAnalysis?.suggestions.slice(0, 3) ?? [],
    };
  },
};
