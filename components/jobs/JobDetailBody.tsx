import Link from "next/link";
import { trackApplicationAction } from "@/app/actions/jobs.actions";
import { SaveJobToggle } from "@/components/social/SaveJobToggle";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, LEVEL_LABEL, STATUS_LABEL, formatSalary, scoreTone, timeAgo } from "@/lib/labels";
import type { JobDetailDTO } from "@/services/social/types";
import { ShareJobButton } from "./ShareJobButton";

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mb-4">
      <h2 className="section-title">{title}</h2>
      <ul className="check-list">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </section>
  );
}

/**
 * Job details, shared by the desktop split-view panel and the full-page route (mobile and deep links).
 * No hooks: it renders on the server or inside the client panel. Only public job fields are shown.
 */
export function JobDetailBody({ detail, signedIn, headingLevel = 1 }: { detail: JobDetailDTO; signedIn: boolean; headingLevel?: 1 | 2 }) {
  const { job, saved, application, match } = detail;
  const H = headingLevel === 1 ? "h1" : "h2";
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/jobs/${job.id}`)}`;
  const closed = application && ["REJECTED", "WITHDRAWN"].includes(application.status);

  return (
    <article className="job-detail">
      <header className="job-detail-header">
        <H className="page-title mb-1">{job.title}</H>
        <p className="job-company fs-5 mb-2">{job.company}</p>
        {match && (
          <p className="mb-2">
            <span className={`match-pill tone-${scoreTone(match.score)}`} title="Internal recommendation indicator, not a guarantee of fit">{match.score}% match · {match.label}</span>
          </p>
        )}
        <ul className="job-meta">
          <li><i className="bi bi-geo-alt" aria-hidden="true" /> {job.location}</li>
          <li><i className="bi bi-building" aria-hidden="true" /> {ARRANGEMENT_LABEL[job.workArrangement]}</li>
          <li><i className="bi bi-clock" aria-hidden="true" /> {EMPLOYMENT_LABEL[job.employmentType]}</li>
          <li><i className="bi bi-mortarboard" aria-hidden="true" /> {LEVEL_LABEL[job.experienceLevel]}</li>
          <li><i className="bi bi-calendar3" aria-hidden="true" /> Posted {timeAgo(job.postedAt)}</li>
        </ul>
        <p className="job-salary fs-5 mb-3">{formatSalary(job.salaryMin, job.salaryMax, job.currency)} <span className="text-muted fw-normal fs-6">/ month</span></p>
        <div className="d-flex flex-wrap gap-1 mb-3">
          {job.skills.map((s) => <SkillBadge key={s.name} name={s.name} tone={s.required ? "neutral" : "missing"} />)}
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          {!signedIn ? (
            <Link href={loginHref} className="btn btn-brand">Log in to apply</Link>
          ) : application ? (
            <Link href="/applications" className="btn btn-soft" aria-label={`Application status: ${STATUS_LABEL[application.status]}. View application.`}>
              <i className="bi bi-check2-circle me-1" aria-hidden="true" />
              {application.status === "APPLIED" ? "Applied" : closed ? STATUS_LABEL[application.status] : `Application in progress · ${STATUS_LABEL[application.status]}`}
            </Link>
          ) : (
            <form action={trackApplicationAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <SubmitButton className="btn btn-brand" pendingText="Adding…">Apply Now</SubmitButton>
            </form>
          )}
          {signedIn ? <SaveJobToggle jobId={job.id} saved={saved} className="btn btn-outline-brand" /> : null}
          <ShareJobButton jobId={job.id} title={`${job.title} at ${job.company}`} className="btn btn-outline-brand" />
          {signedIn && !application && <Link href={`/ats-checker?jobId=${job.id}`} className="btn btn-link btn-sm">Check my resume</Link>}
        </div>
        {signedIn && !application && <p className="small text-muted mt-2 mb-0">Apply Now adds this job to your Applications tracker so you can follow every step.</p>}
      </header>

      {match && match.reasons.length > 0 && (
        <section className="reason-box" aria-label="Why this job is recommended">
          <h2 className="sub-title mb-2"><i className="bi bi-lightbulb me-1" aria-hidden="true" /> Why this is recommended</h2>
          <ul className="mb-0 ps-3">{match.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
      )}
      {!signedIn && <p className="small text-muted"><Link href={loginHref}>Log in</Link> to see how well you match this job.</p>}

      <section className="mb-4 mt-4"><h2 className="section-title">About the role</h2><p className="job-description">{job.description}</p></section>
      <List title="Responsibilities" items={job.responsibilities} />
      <List title="Requirements" items={job.requirements} />
      <List title="Preferred qualifications" items={job.preferred} />
      <List title="Benefits" items={job.benefits} />
      <section className="mb-2">
        <h2 className="section-title">About {job.company}</h2>
        <p>{job.companyDescription || `${job.company} is hiring for this position.`}</p>
        <Link href={`/jobs?keyword=${encodeURIComponent(job.company)}`} className="small">See more jobs at {job.company}</Link>
      </section>
    </article>
  );
}
