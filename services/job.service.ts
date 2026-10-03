import { cache } from "react";
import { AppError } from "@/lib/errors";
import type { JobSort } from "@/lib/job-search";
import type { JobListItem } from "@/types";
import { applicationRepository } from "@/repositories/application.repository";
import { jobRepository, type JobFilters, type JobWithSkills } from "@/repositories/job.repository";
import { savedJobRepository } from "@/repositories/saved-job.repository";
import { getJobProvider } from "./job-provider.service";
import { jobRecommendationService } from "./jobs/job-recommendation.service";

const getJobCached = cache((id: string) => getJobProvider().getById(id));

export const JOBS_PAGE_SIZE = 15;
const CANDIDATE_WINDOW = 300;

/** Cursors are opaque to clients: a base64url-encoded row offset. Invalid input falls back to the first page. */
export const encodeCursor = (offset: number) => Buffer.from(String(offset)).toString("base64url");
export function decodeCursor(cursor?: string | null): number {
  if (!cursor) return 0;
  const n = Number(Buffer.from(cursor, "base64url").toString());
  return Number.isInteger(n) && n >= 0 && n <= 10_000 ? n : 0;
}

/** Plain-text relevance for the keyword: title hits beat company hits beat skill hits beat description hits. */
function keywordScore(job: JobWithSkills, keyword?: string): number {
  if (!keyword) return 0;
  const words = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const w of words) {
    if (job.title.toLowerCase().includes(w)) score += 50;
    if (job.company.toLowerCase().includes(w)) score += 20;
    if (job.skills.some((s) => s.skill.name.toLowerCase().includes(w))) score += 10;
    if (job.description.toLowerCase().includes(w)) score += 3;
  }
  return score;
}

export type JobPage = { items: JobListItem[]; nextCursor: string | null; hasMore: boolean };

export const jobService = {
  /**
   * Server-side search. Filtering and (for newest/salary) ordering and paging happen in SQL.
   * Relevance and best-match need scores, so they rank a bounded candidate window in memory.
   */
  async searchPage(filters: JobFilters, sort: JobSort, userId: string | null, cursor?: string | null, limit = JOBS_PAGE_SIZE): Promise<JobPage> {
    const offset = decodeCursor(cursor);
    const ctx = userId ? await jobRecommendationService.loadContext(userId) : null;

    let rows: JobWithSkills[];
    let hasMore: boolean;
    const needsScores = sort === "best_match" || sort === "relevance";

    if (!needsScores) {
      const order = sort === "salary_desc" ? "salary_desc" : sort === "salary_asc" ? "salary_asc" : "newest";
      const fetched = await jobRepository.page(filters, order, offset, limit);
      hasMore = fetched.length > limit;
      rows = hasMore ? fetched.slice(0, limit) : fetched;
    } else {
      const window = await jobRepository.candidates(filters, CANDIDATE_WINDOW);
      const scored = window.map((job, index) => {
        const match = ctx ? jobRecommendationService.score(job, ctx.candidate).score : 0;
        const rank = sort === "best_match" ? match * 100 + keywordScore(job, filters.keyword) : keywordScore(job, filters.keyword) * 100 + match;
        return { job, index, rank };
      });
      scored.sort((a, b) => b.rank - a.rank || a.index - b.index);
      const slice = scored.slice(offset, offset + limit + 1);
      hasMore = slice.length > limit;
      rows = (hasMore ? slice.slice(0, limit) : slice).map((s) => s.job);
    }

    const items = ctx
      ? await jobRecommendationService.decorate(userId!, rows, ctx)
      : rows.map((j): JobListItem => ({ ...j, match: null, saved: false }));
    return { items, hasMore, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  },

  /** Cached per request so generateMetadata and the page share one query. */
  getPublic: getJobCached,

  /**
   * Everything the details panel needs. Only public job fields are returned: there is no recruiter or
   * private company data in the Job model, and none is added here.
   */
  async detail(id: string, userId: string | null) {
    const job = await getJobCached(id);
    if (!job) return null;
    if (!userId) return { job, saved: false, applicationId: null as string | null, application: null, recommendation: null };

    const [ctx, application] = await Promise.all([
      jobRecommendationService.loadContext(userId),
      applicationRepository.findByJob(userId, id),
    ]);
    const recommendation = jobRecommendationService.score(job, ctx.candidate);
    // keep the JobMatch table in step; a failure here must never break the page
    jobRecommendationService.persist(userId, job, recommendation.score).catch((e) => console.error("JobMatch persist failed", e));
    return { job, saved: ctx.savedIds.has(id), applicationId: application?.id ?? null, application, recommendation };
  },

  async listSaved(userId: string) {
    const rows = await savedJobRepository.listByUser(userId);
    const items = await jobRecommendationService.decorate(userId, rows.map((r) => r.job));
    return rows.map((r, i) => ({ savedAt: r.savedAt, job: { ...items[i], saved: true } as JobListItem }));
  },

  async toggleSave(userId: string, jobId: string) {
    const job = await getJobProvider().getById(jobId);
    if (!job) return null;
    const saved = await savedJobRepository.idsForUser(userId);
    if (saved.has(jobId)) { await savedJobRepository.remove(userId, jobId); return false; }
    await savedJobRepository.save(userId, jobId);
    return true;
  },

  /** Explicit save/unsave for the JSON API (idempotent, unlike toggle). */
  async setSaved(userId: string, jobId: string, saved: boolean) {
    const job = await getJobProvider().getById(jobId);
    if (!job) throw new AppError("This job is no longer available.", "NOT_FOUND");
    if (saved) await savedJobRepository.save(userId, jobId);
    else await savedJobRepository.remove(userId, jobId);
    return saved;
  },
};
