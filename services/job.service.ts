import { cache } from "react";
import type { JobSort } from "@/lib/job-search";
import type { JobListItem } from "@/types";
import { applicationRepository } from "@/repositories/application.repository";
import type { JobFilters } from "@/repositories/job.repository";
import { savedJobRepository } from "@/repositories/saved-job.repository";
import { getJobProvider } from "./job-provider.service";
import { jobMatchService } from "./job-match.service";

const getJobCached = cache((id: string) => getJobProvider().getById(id));

export const jobService = {
  async search(filters: JobFilters, sort: JobSort, userId: string | null): Promise<JobListItem[]> {
    const jobs = await getJobProvider().search(filters);
    const [matches, saved] = userId
      ? await Promise.all([jobMatchService.forUser(userId, jobs), savedJobRepository.idsForUser(userId)])
      : [new Map(), new Set<string>()];

    const items: JobListItem[] = jobs.map((j) => ({ ...j, match: matches.get(j.id)?.overall ?? null, saved: saved.has(j.id) }));

    if (sort === "salary") items.sort((a, b) => (b.salaryMax ?? 0) - (a.salaryMax ?? 0));
    if (sort === "relevance") {
      const q = filters.q?.toLowerCase() ?? "";
      const score = (j: JobListItem) =>
        (q && j.title.toLowerCase().includes(q) ? 50 : 0) +
        (q && j.company.toLowerCase().includes(q) ? 20 : 0) +
        (q && j.skills.some((s) => s.skill.name.toLowerCase().includes(q)) ? 10 : 0) +
        (j.match ?? 0) / 10;
      items.sort((a, b) => score(b) - score(a));
    }
    return items;
  },

  /** Cached per request so generateMetadata and the page share one query. */
  getPublic: getJobCached,

  async detail(id: string, userId: string | null) {
    const job = await getJobCached(id);
    if (!job) return null;
    if (!userId) return { job, saved: false, applicationId: null as string | null, match: null };
    const [saved, matches, application] = await Promise.all([
      savedJobRepository.idsForUser(userId),
      jobMatchService.forUser(userId, [job], { persist: true }),
      applicationRepository.findByJob(userId, id),
    ]);
    return { job, saved: saved.has(id), applicationId: application?.id ?? null, match: matches.get(id) ?? null };
  },

  async listSaved(userId: string) {
    const rows = await savedJobRepository.listByUser(userId);
    const matches = await jobMatchService.forUser(userId, rows.map((r) => r.job));
    return rows.map((r) => ({ savedAt: r.savedAt, job: { ...r.job, match: matches.get(r.job.id)?.overall ?? null, saved: true } as JobListItem }));
  },

  async toggleSave(userId: string, jobId: string) {
    const job = await getJobProvider().getById(jobId);
    if (!job) return null;
    const saved = await savedJobRepository.idsForUser(userId);
    if (saved.has(jobId)) { await savedJobRepository.remove(userId, jobId); return false; }
    await savedJobRepository.save(userId, jobId);
    return true;
  },
};
