import Link from "next/link";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, formatSalaryCompact, scoreTone } from "@/lib/labels";
import type { JobSummaryDTO } from "@/services/social/types";
import { SaveJobToggle } from "./SaveJobToggle";

/** Specialised feed card for a recommended job. The match number is an internal indicator, not a guarantee. */
export function JobFeedCard({ job }: { job: JobSummaryDTO }) {
  return (
    <article className="feed-card job-feed-card" aria-label={`Recommended job: ${job.title}`}>
      <div className="feed-card-kicker"><i className="bi bi-fire" aria-hidden="true" /> Recommended job</div>
      <div className="d-flex justify-content-between gap-3 align-items-start">
        <div className="min-w-0">
          <h3 className="job-title mb-1"><Link href={`/jobs/${job.id}`}>{job.title}</Link></h3>
          <p className="job-company mb-1">{job.company}</p>
          <p className="text-muted small mb-1">{ARRANGEMENT_LABEL[job.workArrangement]} · {EMPLOYMENT_LABEL[job.employmentType]}</p>
          <p className="job-salary mb-0">{formatSalaryCompact(job.salaryMin, job.salaryMax, job.currency)}<span className="text-muted fw-normal small">/month</span></p>
        </div>
        {job.match !== null && (
          <span className={`match-pill tone-${scoreTone(job.match)} flex-shrink-0`} title="Internal recommendation indicator, not a guarantee of fit">{job.match}% match</span>
        )}
      </div>
      {job.reasons[0] && <p className="reason mt-2 mb-0"><i className="bi bi-lightbulb" aria-hidden="true" /> {job.reasons[0]}</p>}
      <div className="d-flex gap-2 mt-3">
        <Link href={`/jobs/${job.id}`} className="btn btn-brand btn-sm">View job</Link>
        <SaveJobToggle jobId={job.id} saved={job.saved} />
      </div>
    </article>
  );
}
