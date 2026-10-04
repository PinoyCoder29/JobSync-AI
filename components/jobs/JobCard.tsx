import Link from "next/link";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, formatDate, formatSalary, timeAgo } from "@/lib/labels";
import type { JobListItem } from "@/types";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { MatchPill } from "./JobMatchScore";
import { SaveJobButton } from "./SaveJobButton";

export function JobCard({ job, savedAt, showSave = true }: { job: JobListItem; savedAt?: Date; showSave?: boolean }) {
  return (
    <article className="job-card">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div className="min-w-0">
          <h3 className="job-title"><Link href={`/jobs/${job.id}`}>{job.title}</Link></h3>
          <p className="job-company text-truncate" title={job.company}>{job.company}</p>
        </div>
        <MatchPill value={job.match} />
      </div>
      <ul className="job-meta">
        <li><i className="bi bi-geo-alt" aria-hidden="true" /> {job.location}</li>
        <li><i className="bi bi-building" aria-hidden="true" /> {ARRANGEMENT_LABEL[job.workArrangement]}</li>
        <li><i className="bi bi-clock" aria-hidden="true" /> {EMPLOYMENT_LABEL[job.employmentType]}</li>
      </ul>
      <p className="job-salary">{formatSalary(job.salaryMin, job.salaryMax, job.currency)} <span className="text-muted fw-normal">/ month</span></p>
      <div className="d-flex flex-wrap gap-1 mb-3">
        {job.skills.slice(0, 5).map((s) => <SkillBadge key={s.id} name={s.skill.name} />)}
        {job.skills.length > 5 && <span className="skill-badge skill-neutral">+{job.skills.length - 5}</span>}
      </div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span className="small text-muted">{savedAt ? `Saved ${formatDate(savedAt)}` : `Posted ${timeAgo(job.postedAt)}`}</span>
        <div className="d-flex gap-2">
          {showSave && <SaveJobButton jobId={job.id} saved={job.saved} />}
          <Link href={`/jobs/${job.id}`} className="btn btn-brand btn-sm">View job</Link>
        </div>
      </div>
    </article>
  );
}
