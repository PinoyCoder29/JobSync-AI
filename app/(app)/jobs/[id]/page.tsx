import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { trackApplicationAction } from "@/app/actions/jobs.actions";
import { SaveJobButton } from "@/components/jobs/SaveJobButton";
import { PageMessage } from "@/components/ui/PageMessage";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, LEVEL_LABEL, formatSalary, timeAgo } from "@/lib/labels";
import { getCurrentUserId } from "@/lib/session";
import { jobService } from "@/services/job.service";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await jobService.getPublic(id);
  if (!job) return { title: "Job not found" };
  return { title: `${job.title} at ${job.company}`, description: job.description.slice(0, 155) };
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mb-4">
      <h2 className="section-title">{title}</h2>
      <ul className="check-list">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </section>
  );
}

export default async function JobDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const userId = await getCurrentUserId();
  const data = await jobService.detail(id, userId);
  if (!data) notFound();
  const { job, saved, match, applicationId } = data;

  return (
    <div>
      <Link href="/jobs" className="small">← Back to jobs</Link>
      <PageMessage message={error ? "We couldn't track this application. Please try again." : undefined} />
      <header className="job-header">
        <div>
          <h1 className="page-title mb-1">{job.title}</h1>
          <p className="job-company fs-5 mb-2">{job.company}</p>
          <ul className="job-meta">
            <li><i className="bi bi-geo-alt" aria-hidden="true" /> {job.location}</li>
            <li><i className="bi bi-building" aria-hidden="true" /> {ARRANGEMENT_LABEL[job.workArrangement]}</li>
            <li><i className="bi bi-clock" aria-hidden="true" /> {EMPLOYMENT_LABEL[job.employmentType]}</li>
            <li><i className="bi bi-mortarboard" aria-hidden="true" /> {LEVEL_LABEL[job.experienceLevel]}</li>
            <li><i className="bi bi-calendar3" aria-hidden="true" /> Posted {timeAgo(job.postedAt)}</li>
          </ul>
          <p className="job-salary fs-4">{formatSalary(job.salaryMin, job.salaryMax, job.currency)} <span className="text-muted fw-normal fs-6">/ month</span></p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-start">
          <SaveJobButton jobId={job.id} saved={saved} />
          {applicationId ? (
            <Link href="/applications" className="btn btn-soft btn-sm">Tracked – view application</Link>
          ) : (
            <form action={trackApplicationAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <SubmitButton className="btn btn-brand btn-sm" pendingText="Adding…">Track application</SubmitButton>
            </form>
          )}
        </div>
      </header>

      <div className="row g-5 mt-1">
        <div className="col-lg-8">
          <section className="mb-4">
            <h2 className="section-title">About the role</h2>
            <p>{job.description}</p>
          </section>
          <List title="Responsibilities" items={job.responsibilities} />
          <List title="Requirements" items={job.requirements} />
          <List title="Preferred qualifications" items={job.preferred} />
          <section className="mb-4">
            <h2 className="section-title">Skills</h2>
            <div className="d-flex flex-wrap gap-1">
              {job.skills.map((s) => <SkillBadge key={s.id} name={s.skill.name} tone={s.required ? "neutral" : "missing"} />)}
            </div>
            <p className="small text-muted mt-2 mb-0">Outlined skills are nice to have.</p>
          </section>
          <List title="Benefits" items={job.benefits} />
          <section className="mb-4">
            <h2 className="section-title">About {job.company}</h2>
            <p>{job.companyDescription || `${job.company} is hiring for this position.`}</p>
          </section>
        </div>

        <aside className="col-lg-4">
          <div className="side-panel">
            <h2 className="sub-title">Your match <span className="demo-tag">Demo</span></h2>
            {match ? (
              <>
                <p className="match-big">{match.overall}%</p>
                <div className="d-grid gap-3">
                  <ProgressBar value={match.skills} label="Skills" />
                  <ProgressBar value={match.experience} label="Experience" />
                  <ProgressBar value={match.education} label="Education" />
                  <ProgressBar value={match.location} label="Location" />
                </div>
                <p className="small text-muted mt-3 mb-0">A simple score from your profile and resume. It will be replaced when a real matching service is connected.</p>
              </>
            ) : (
              <p className="text-muted mb-0"><Link href={`/login?callbackUrl=/jobs/${job.id}`}>Log in</Link> to see how well you match this job.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
