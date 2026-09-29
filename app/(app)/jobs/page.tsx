import type { Metadata } from "next";
import { FilterPanel } from "@/components/jobs/FilterPanel";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { parseJobSearch } from "@/lib/job-search";
import { getCurrentUserId } from "@/lib/session";
import { jobService } from "@/services/job.service";
import type { JobListItem } from "@/types";

export const metadata: Metadata = {
  title: "Find jobs",
  description: "Search web development and software jobs in the Philippines by title, skill, location, salary and work arrangement.",
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { filters, sort, hasFilters } = parseJobSearch(await searchParams);
  const userId = await getCurrentUserId();

  let jobs: JobListItem[] = [];
  let failed = false;
  try {
    jobs = await jobService.search(filters, sort, userId);
  } catch (error) {
    console.error(error);
    failed = true;
  }
  const activeCount = Object.values(filters).filter((v) => v !== undefined).length;

  return (
    <div>
      <h1 className="page-title">Find jobs</h1>
      <p className="text-muted mb-4">{failed ? "Search is unavailable right now." : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} ${hasFilters ? "match your filters" : "open now"}`}</p>
      <div className="row g-4">
        <aside className="col-lg-4 col-xl-3"><FilterPanel filters={filters} sort={sort} activeCount={activeCount} /></aside>
        <section className="col-lg-8 col-xl-9" aria-label="Job results">
          {failed ? (
            <ErrorState title="Jobs couldn't be loaded" text="There was a problem reaching the database. Please try again shortly." />
          ) : jobs.length === 0 ? (
            <EmptyState icon="bi-search" title="No jobs match these filters" text="Try removing a filter or searching a broader keyword." href="/jobs" actionLabel="Clear filters" />
          ) : (
            <div className="d-grid gap-3">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
          )}
          {!userId && !failed && <p className="small text-muted mt-3">Log in to see match scores and save jobs.</p>}
        </section>
      </div>
    </div>
  );
}
