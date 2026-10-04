import Link from "next/link";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, formatSalary, scoreTone, timeAgo } from "@/lib/labels";
import type { JobSummaryDTO } from "@/services/social/types";

const MAX_SKILLS = 5;

/** The whole card is one link (to /jobs/[id]); on desktop the explorer intercepts the click and opens the side panel. */
export function JobResultCard({ job, selected, onSelect }: { job: JobSummaryDTO; selected?: boolean; onSelect?: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void }) {
  const extra = job.skills.length - MAX_SKILLS;
  return (
    <Link href={`/jobs/${job.id}`} className={`job-card job-result ${selected ? "selected" : ""}`} aria-current={selected ? "true" : undefined} onClick={(e) => onSelect?.(e, job.id)}>
      <div className="d-flex justify-content-between gap-2 align-items-start">
        <div className="min-w-0">
          <h3 className="job-title h6 mb-0">{job.title}</h3>
          <p className="job-company mb-1 text-truncate" title={job.company}>{job.company}</p>
        </div>
        {job.match !== null && <span className={`match-pill tone-${scoreTone(job.match)} flex-shrink-0`} title="Internal recommendation indicator, not a guarantee of fit">{job.match}% match</span>}
      </div>
      <ul className="job-meta small mb-1">
        <li>{job.location}</li>
        <li>{ARRANGEMENT_LABEL[job.workArrangement]}</li>
        <li>{EMPLOYMENT_LABEL[job.employmentType]}</li>
      </ul>
      <p className="job-salary small mb-2">{formatSalary(job.salaryMin, job.salaryMax, job.currency)}{job.salaryMin || job.salaryMax ? " / month" : ""}</p>
      {job.skills.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-2">
          {job.skills.slice(0, MAX_SKILLS).map((s) => <span key={s} className="skill-badge">{s}</span>)}
          {extra > 0 && <span className="skill-badge skill-more">+{extra}</span>}
        </div>
      )}
      <p className="small text-muted mb-0">Posted {timeAgo(job.postedAt)}</p>
    </Link>
  );
}
