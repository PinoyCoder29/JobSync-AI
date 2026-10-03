import { jobInteractionRepository } from "@/repositories/job-interaction.repository";
import { jobRepository, type JobWithSkills } from "@/repositories/job.repository";
import { profileRepository } from "@/repositories/profile.repository";
import { savedJobRepository } from "@/repositories/saved-job.repository";
import { analysisRepository } from "@/repositories/analysis.repository";
import { scoreJob, type JobCandidate, type JobScore, type JobSignals } from "@/lib/recommendations/jobs";
import { computeMatch, jobMatchService } from "@/services/job-match.service";
import type { JobListItem } from "@/types";

export const toSignals = (job: JobWithSkills): JobSignals => ({
  title: job.title,
  location: job.location,
  workArrangement: job.workArrangement,
  employmentType: job.employmentType,
  experienceLevel: job.experienceLevel,
  salaryMin: job.salaryMin,
  salaryMax: job.salaryMax,
  skills: job.skills.map((s) => ({ name: s.skill.name, required: s.required })),
});

export type RecommendationContext = { candidate: JobCandidate; appliedJobIds: Set<string>; savedIds: Set<string> };

export const jobRecommendationService = {
  /** Gathers everything the scorer needs from the user's real data. Nothing here is invented. */
  async loadContext(userId: string): Promise<RecommendationContext> {
    const [base, profile, interactions, savedIds] = await Promise.all([
      jobMatchService.loadCandidate(userId), // skills (profile + resume), experience years, location, arrangement
      profileRepository.findByUser(userId),
      jobInteractionRepository.signals(userId),
      savedJobRepository.idsForUser(userId),
    ]);
    return {
      candidate: {
        skills: base.skills,
        years: base.years,
        location: base.location,
        preferredLocations: base.preferredLocations,
        arrangement: base.arrangement,
        targetRoles: profile?.targetRoles ?? [],
        salaryMin: profile?.salaryExpectationMin ?? null,
        salaryMax: profile?.salaryExpectationMax ?? null,
        interactionSkills: interactions.skills,
        interactionEmploymentTypes: interactions.employmentTypes,
      },
      appliedJobIds: interactions.appliedJobIds,
      savedIds,
    };
  },

  score(job: JobWithSkills, candidate: JobCandidate): JobScore {
    return scoreJob(toSignals(job), candidate);
  },

  /** Scores a set of jobs and returns list items (match %, label, reasons, saved flag) in the same order. */
  async decorate(userId: string, jobs: JobWithSkills[], ctx?: RecommendationContext): Promise<JobListItem[]> {
    const context = ctx ?? (await this.loadContext(userId));
    return jobs.map((job) => {
      const s = this.score(job, context.candidate);
      return { ...job, match: s.score, matchLabel: s.label, reasons: s.reasons, saved: context.savedIds.has(job.id) };
    });
  },

  /**
   * The user's best open jobs. Jobs already applied to are left out; sorted by score, ties by newest.
   * Works on a bounded window of recent jobs so the cost stays flat as the table grows.
   */
  async recommend(userId: string, limit = 5, window = 80): Promise<JobListItem[]> {
    const ctx = await this.loadContext(userId);
    const jobs = (await jobRepository.listActive(window)).filter((j) => !ctx.appliedJobIds.has(j.id));
    const items = await this.decorate(userId, jobs, ctx);
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => (b.item.match ?? 0) - (a.item.match ?? 0) || a.index - b.index)
      .slice(0, limit)
      .map((r) => r.item);
  },

  /** Keeps the existing JobMatch table in step with what the UI shows (education/location detail from the legacy heuristic). */
  async persist(userId: string, job: JobWithSkills, score: number) {
    const base = await jobMatchService.loadCandidate(userId);
    const legacy = computeMatch(job, base);
    await analysisRepository.saveMatches([{ userId, jobId: job.id, overall: score, skills: legacy.skills, experience: legacy.experience, education: legacy.education, location: legacy.location }]);
  },
};
