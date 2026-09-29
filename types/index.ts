import type { JobWithSkills } from "@/repositories/job.repository";

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export type JobListItem = JobWithSkills & { match: number | null; saved: boolean };
