import type { ApplicationStatus } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ApplicationTimeline } from "@/components/applications/ApplicationTimeline";
import { StatusForm } from "@/components/applications/StatusForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_LABEL, formatDate, keysOf } from "@/lib/labels";
import { requireUserId } from "@/lib/session";
import { applicationService } from "@/services/application.service";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const userId = await requireUserId();
  const { status } = await searchParams;
  const filter = keysOf(STATUS_LABEL).find((s) => s === status) as ApplicationStatus | undefined;
  const [apps, counts] = await Promise.all([applicationService.list(userId, filter), applicationService.counts(userId)]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="d-grid gap-4">
      <div>
        <h1 className="page-title">Applications</h1>
        <p className="text-muted mb-0">Track every application, its next step and its history.</p>
      </div>

      <nav aria-label="Filter by status" className="status-tabs">
        <Link href="/applications" className={!filter ? "active" : ""}>All ({total})</Link>
        {keysOf(STATUS_LABEL).map((s) => (
          <Link key={s} href={`/applications?status=${s}`} className={filter === s ? "active" : ""}>{STATUS_LABEL[s]} ({counts[s] ?? 0})</Link>
        ))}
      </nav>

      {apps.length === 0 ? (
        <EmptyState icon="bi-kanban" title={filter ? `No ${STATUS_LABEL[filter].toLowerCase()} applications` : "No applications yet"} text="Track a job from its detail page, or add an application below." href="/jobs" actionLabel="Find jobs" />
      ) : (
        <div className="d-grid gap-3">
          {apps.map((a) => (
            <article key={a.id} className="application">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <div>
                  <h2 className="h5 mb-0">{a.jobId ? <Link href={`/jobs/${a.jobId}`}>{a.position}</Link> : a.position}</h2>
                  <p className="job-company mb-0">{a.company}</p>
                </div>
                <div className="text-md-end">
                  <StatusBadge status={a.status} />
                  <div className="small text-muted mt-1">Applied {formatDate(a.appliedAt)}</div>
                </div>
              </div>
              <dl className="app-facts">
                {a.nextStep && (<div><dt>Next step</dt><dd>{a.nextStep}</dd></div>)}
                {a.notes && (<div><dt>Notes</dt><dd>{a.notes}</dd></div>)}
                {a.jobUrl && (<div><dt>Job link</dt><dd><a href={a.jobUrl} target="_blank" rel="noopener noreferrer">{a.jobUrl}</a></dd></div>)}
              </dl>
              <details className="mt-2">
                <summary className="small fw-semibold">Timeline and status update</summary>
                <div className="row g-4 mt-1">
                  <div className="col-md-6"><ApplicationTimeline history={a.history} /></div>
                  <div className="col-md-6"><StatusForm applicationId={a.id} current={a.status} /></div>
                </div>
              </details>
            </article>
          ))}
        </div>
      )}

      <section>
        <h2 className="section-title">Add an application</h2>
        <p className="text-muted">Applied somewhere outside JobSync AI? Record it here.</p>
        <ApplicationForm />
      </section>
    </div>
  );
}
