import type { Metadata } from "next";
import Link from "next/link";
import { runATSAction } from "@/app/actions/analysis.actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageMessage } from "@/components/ui/PageMessage";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDate } from "@/lib/labels";
import { requireUserId } from "@/lib/session";
import { atsService, type ATSCheck } from "@/services/ats.service";
import { resumeService } from "@/services/resume.service";

export const metadata: Metadata = { title: "ATS checker" };

export default async function ATSPage({ searchParams }: { searchParams: Promise<{ jobId?: string; error?: string }> }) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const [options, { exists }] = await Promise.all([atsService.jobOptions(userId), resumeService.getForEditor(userId)]);
  const selected = options.find((o) => o.id === sp.jobId) ?? options[0];
  const result = selected ? await atsService.latest(userId, selected.id) : null;
  const checks = (result?.checks ?? []) as ATSCheck[];
  const total = result ? result.matchedKeywords.length + result.missingKeywords.length : 0;

  return (
    <div className="d-grid gap-4">
      <div>
        <h1 className="page-title">ATS checker <span className="demo-tag">Demo check</span></h1>
        <p className="text-muted mb-0">Compares your saved resume with a job's skills and checks basic structure. This is a simple keyword check, not a real ATS engine.</p>
      </div>
      <PageMessage message={sp.error} />

      {!exists ? (
        <EmptyState icon="bi-file-earmark-person" title="Build your resume first" text="The check runs against your saved resume." href="/resume" actionLabel="Open resume builder" />
      ) : !selected ? (
        <EmptyState icon="bi-briefcase" title="No jobs to check against" text="Once jobs are available you can compare your resume with them." href="/jobs" actionLabel="Find jobs" />
      ) : (
        <>
          <form method="get" className="d-flex flex-wrap align-items-end gap-2">
            <div className="flex-grow-1">
              <label htmlFor="jobId" className="form-label small fw-semibold">Check against</label>
              <select id="jobId" name="jobId" className="form-select" defaultValue={selected.id}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
            </div>
            <button type="submit" className="btn btn-outline-brand">Switch job</button>
          </form>

          <form action={runATSAction}>
            <input type="hidden" name="jobId" value={selected.id} />
            <SubmitButton pendingText="Checking…">{result ? "Re-run check" : "Run ATS check"}</SubmitButton>
          </form>

          {!result ? (
            <EmptyState icon="bi-check2-square" title="No check for this job yet" text="Run the check to see matched keywords, gaps and formatting results." />
          ) : (
            <>
              <section className="d-flex flex-wrap align-items-center gap-4">
                <ScoreRing value={result.score} label="ATS compatibility" size={140} />
                <div>
                  <p className="text-muted mb-1">Matched keywords</p>
                  <p className="match-big mb-1">{result.matchedKeywords.length} <span className="fs-5 text-muted">/ {total}</span></p>
                  <p className="small text-muted mb-0">Checked {formatDate(result.createdAt)} · {result.isDemo ? "demo provider" : result.provider}</p>
                </div>
              </section>
              <div className="row g-4">
                <section className="col-md-6"><h2 className="section-title">Matched skills</h2><div className="d-flex flex-wrap gap-1">{result.matchedKeywords.length ? result.matchedKeywords.map((k) => <SkillBadge key={k} name={k} tone="have" />) : <span className="text-muted">None yet</span>}</div></section>
                <section className="col-md-6"><h2 className="section-title">Missing keywords</h2><div className="d-flex flex-wrap gap-1">{result.missingKeywords.length ? result.missingKeywords.map((k) => <SkillBadge key={k} name={k} tone="missing" />) : <span className="text-muted">Nothing missing</span>}</div></section>
              </div>
              <section>
                <h2 className="section-title">Formatting and section checks</h2>
                <ul className="check-table">
                  {checks.map((c) => (
                    <li key={c.label}>
                      <i className={`bi ${c.passed ? "bi-check-circle-fill text-success" : "bi-x-circle-fill text-danger"}`} aria-hidden="true" />
                      <div><strong>{c.label}</strong> <span className="visually-hidden">{c.passed ? "passed" : "needs attention"}</span><div className="small text-muted">{c.detail}</div></div>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="section-title">Recommendations</h2>
                <ol className="action-list">{result.recommendations.map((r) => <li key={r}>{r}</li>)}</ol>
                <Link href="/resume">Edit your resume</Link>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
