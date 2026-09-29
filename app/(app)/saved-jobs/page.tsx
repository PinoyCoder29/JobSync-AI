import type { Metadata } from "next";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUserId } from "@/lib/session";
import { jobService } from "@/services/job.service";

export const metadata: Metadata = { title: "Saved jobs" };

export default async function SavedJobsPage() {
  const userId = await requireUserId();
  const saved = await jobService.listSaved(userId);
  return (
    <div>
      <h1 className="page-title">Saved jobs</h1>
      <p className="text-muted mb-4">{saved.length} saved</p>
      {saved.length === 0 ? (
        <EmptyState icon="bi-bookmark" title="No saved jobs yet" text="Save jobs you're interested in and they'll appear here." href="/jobs" actionLabel="Find jobs" />
      ) : (
        <div className="d-grid gap-3">{saved.map((s) => <JobCard key={s.job.id} job={s.job} savedAt={s.savedAt} />)}</div>
      )}
    </div>
  );
}
