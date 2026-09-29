import type { ApplicationStatus } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { applicationRepository } from "@/repositories/application.repository";
import { getJobProvider } from "./job-provider.service";

export const applicationService = {
  list(userId: string, status?: ApplicationStatus) {
    return applicationRepository.listByUser(userId, status);
  },

  counts(userId: string) {
    return applicationRepository.countsByStatus(userId);
  },

  create(userId: string, input: { company: string; position: string; status: ApplicationStatus; appliedAt: Date; nextStep?: string; notes?: string; jobUrl?: string }) {
    return applicationRepository.create({
      userId,
      company: input.company,
      position: input.position,
      status: input.status,
      appliedAt: input.appliedAt,
      nextStep: input.nextStep || null,
      notes: input.notes || null,
      jobUrl: input.jobUrl || null,
    });
  },

  /** "Track application" from a job page. Idempotent: returns the existing record if there is one. */
  async trackFromJob(userId: string, jobId: string) {
    const existing = await applicationRepository.findByJob(userId, jobId);
    if (existing) return existing;
    const job = await getJobProvider().getById(jobId);
    if (!job) throw new AppError("This job is no longer available.", "NOT_FOUND");
    return applicationRepository.create({
      userId, jobId, company: job.company, position: job.title, status: "APPLIED", appliedAt: new Date(),
      nextStep: "Follow up in about a week", jobUrl: null, notes: null,
    });
  },

  async changeStatus(userId: string, input: { applicationId: string; status: ApplicationStatus; note?: string }) {
    const app = await applicationRepository.findOwned(input.applicationId, userId);
    if (!app) throw new AppError("Application not found.", "NOT_FOUND");
    if (app.status === input.status) throw new AppError("The application is already in that status.");
    await applicationRepository.changeStatus(app.id, input.status, input.note);
  },
};
