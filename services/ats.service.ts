import { applicationRepository } from "@/repositories/application.repository";
import { jobRepository } from "@/repositories/job.repository";
import { savedJobRepository } from "@/repositories/saved-job.repository";

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
  }
};
