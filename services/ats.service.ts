import { AppError } from "@/lib/errors";
import { analysisRepository } from "@/repositories/analysis.repository";
import { applicationRepository } from "@/repositories/application.repository";
import { jobRepository } from "@/repositories/job.repository";
import { savedJobRepository } from "@/repositories/saved-job.repository";
import { getAIProvider } from "./ai";
import { resumeService } from "./resume.service";

export type ATSCheck = { label: string; passed: boolean; detail: string };

export const atsService = {
  async jobOptions(userId: string) {
    const [saved, applied, recent] = await Promise.all([
      savedJobRepository.listByUser(userId),
      applicationRepository.jobIdsForUser(userId),
      jobRepository.listActive(20),
    ]);
    const options = new Map<string, { id: string; label: string }>();
    const add = (j: { id: string; title: string; company: string }) => options.set(j.id, { id: j.id, label: `${j.title} – ${j.company}` });
    saved.forEach((s) => add(s.job));
    const appliedJobs = await jobRepository.listByIds(applied.map((a) => a.jobId!).filter(Boolean));
    appliedJobs.forEach(add);
    recent.forEach(add);
    return [...options.values()];
  },

  latest(userId: string, jobId: string) {
    return analysisRepository.latestATS(userId, jobId);
  },

  async run(userId: string, jobId: string) {
    const [job, data] = await Promise.all([jobRepository.findById(jobId), resumeService.getSnapshot(userId)]);
    if (!job) throw new AppError("That job could not be found.", "NOT_FOUND");
    if (!data) throw new AppError("Build your resume first, then run the ATS check.", "NOT_FOUND");
    const ai = getAIProvider();
    const r = await ai.analyzeATS(data.snapshot, job.skills.map((s) => s.skill.name));
    return analysisRepository.createATS({
      userId, resumeId: data.resumeId, jobId, score: r.score, matchedKeywords: r.matchedKeywords,
      missingKeywords: r.missingKeywords, checks: r.checks, recommendations: r.recommendations,
      provider: ai.name, isDemo: ai.isDemo,
    });
  },
};
