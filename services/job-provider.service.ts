import { jobRepository, type JobFilters, type JobWithSkills } from "@/repositories/job.repository";

/** Contract for any source of jobs. A future external API adapter implements this same interface. */
export interface JobProvider {
  readonly name: string;
  search(filters: JobFilters): Promise<JobWithSkills[]>;
  getById(id: string): Promise<JobWithSkills | null>;
  listRecent(limit: number): Promise<JobWithSkills[]>;
}

export class DatabaseJobProvider implements JobProvider {
  readonly name = "database";
  search(filters: JobFilters) { return jobRepository.search(filters); }
  getById(id: string) { return jobRepository.findById(id); }
  listRecent(limit: number) { return jobRepository.listActive(limit); }
}

// FutureExternalJobProvider goes here later: fetch from the chosen API, map the response to JobWithSkills.
// (Optionally cache results in the Job table using Job.source + Job.externalId, already in the schema.)

let provider: JobProvider | null = null;
export function getJobProvider(): JobProvider {
  return (provider ??= new DatabaseJobProvider());
}
