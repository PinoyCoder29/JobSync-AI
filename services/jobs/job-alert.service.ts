import { AppError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jobMatchesAlert } from "@/lib/job-alerts";
import type { JobAlertInput } from "@/lib/validations/job-alert";
import { jobAlertRepository } from "@/repositories/job-alert.repository";
import type { JobWithSkills } from "@/repositories/job.repository";
import { notificationService } from "@/services/social/notification.service";

const MAX_ALERTS = 10;

export const jobAlertService = {
  list: (userId: string) => jobAlertRepository.listByUser(userId),

  async create(userId: string, input: JobAlertInput) {
    enforceRateLimit(userId, "jobAlert");
    if ((await jobAlertRepository.count(userId)) >= MAX_ALERTS) throw new AppError(`You can have up to ${MAX_ALERTS} job alerts. Delete one to add another.`, "CONFLICT");
    return jobAlertRepository.create({ userId, ...input });
  },

  async remove(userId: string, id: string) {
    if (!(await jobAlertRepository.deleteOwned(id, userId))) throw new AppError("That alert no longer exists.", "NOT_FOUND");
  },

  /**
   * Call this when a job is published (a future job-posting flow or an external provider import).
   * Notifies each matching user once. Batched so it stays cheap as alerts grow.
   */
  async notifyForNewJob(job: JobWithSkills): Promise<number> {
    const alertable = {
      title: job.title, company: job.company, description: job.description, location: job.location, currency: job.currency,
      workArrangement: job.workArrangement, employmentType: job.employmentType, experienceLevel: job.experienceLevel,
      salaryMin: job.salaryMin, salaryMax: job.salaryMax, skills: job.skills.map((s) => s.skill.name),
    };
    const notified = new Set<string>();
    for (let skip = 0; ; skip += 200) {
      const batch = await jobAlertRepository.activeBatch(skip, 200);
      if (batch.length === 0) break;
      for (const alert of batch) {
        if (notified.has(alert.userId) || !jobMatchesAlert(alertable, alert)) continue;
        notified.add(alert.userId);
        await notificationService.notify({ recipientId: alert.userId, type: "JOB_ALERT_MATCH", jobId: job.id });
      }
    }
    return notified.size;
  },
};
