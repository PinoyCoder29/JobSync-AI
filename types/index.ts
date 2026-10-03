import type { JobWithSkills } from "@/repositories/job.repository";

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export type JobListItem = JobWithSkills & {
  /** Internal recommendation indicator (0-100), not a guarantee of fit. Null when signed out. */
  match: number | null;
  saved: boolean;
  matchLabel?: string;
  /** Explainable reasons, always derived from the user's real profile/resume/activity data. */
  reasons?: string[];
};
