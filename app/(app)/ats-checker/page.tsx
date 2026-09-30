import type { Metadata } from "next";
import { ATSCheckerForm } from "@/components/analysis/ATSCheckerForm";
import { ATSReportView } from "@/components/analysis/ATSReportView";
import { HistoryList } from "@/components/analysis/HistoryList";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { requireUserId } from "@/lib/session";
import { atsCheckerService } from "@/services/analysis/ats-checker.service";
import { isGeminiConfigured } from "@/services/analysis/gemini";
import { atsReportSchema } from "@/services/analysis/schemas";
import { atsService } from "@/services/ats.service";
import { resumeService } from "@/services/resume.service";

export const metadata: Metadata = { title: "ATS checker" };

export default async function ATSPage({ searchParams }: { searchParams: Promise<{ id?: string; jobId?: string }> }) {
  const userId = await requireUserId();
  const { id, jobId } = await searchParams;
  const [history, jobs, { exists }] = await Promise.all([atsCheckerService.history(userId), atsService.jobOptions(userId), resumeService.getForEditor(userId)]);

  const selectedId = id ?? history[0]?.id;
  const selected = selectedId ? await atsCheckerService.getOwned(userId, selectedId) : null;
  const parsed = selected?.details ? atsReportSchema.safeParse(selected.details.report) : null;
  const defaultJobId = jobs.some((j) => j.id === jobId) ? (jobId as string) : "";

  return (
    <div className="d-grid gap-4">
      <header>
        <h1 className="page-title">ATS checker</h1>
        <p className="tool-tagline ats"><i className="bi bi-bullseye me-1" aria-hidden="true" />Match my resume to this job. We compare your resume with one specific job description.</p>
        <p className="text-muted mb-0">Want general feedback on the resume itself? Use the <a href="/resume-analyzer">resume analyzer</a>.</p>
      </header>

      <ATSCheckerForm hasBuilderResume={exists} aiReady={isGeminiConfigured()} hasResult={Boolean(selected)} jobs={jobs} defaultJobId={defaultJobId} />

      <div className="row g-4" id="results">
        <div className="col-xl-9 order-2 order-xl-1">
          {id && !selected && <div className="alert alert-warning" role="alert">We couldn't find that check.</div>}
          {selected && parsed?.success && selected.details && (
            <ATSReportView
              report={parsed.data} createdAt={selected.row.createdAt} model={selected.row.model} truncated={selected.details.truncated}
              jobTitle={selected.row.jobTitle} jobCompany={selected.row.jobCompany}
            />
          )}
          {selected && !parsed?.success && (
            <div className="empty-state">
              <ScoreRing value={selected.row.score} label="Old demo score" size={110} />
              <h2 className="h5 mt-3">This is an older demo result</h2>
              <p className="text-muted mb-0">Run a new check above to get the full AI comparison.</p>
            </div>
          )}
          {!selected && !id && (
            <div className="empty-state">
              <i className="bi bi-bullseye" aria-hidden="true" />
              <h2 className="h5 mb-1">No ATS check yet</h2>
              <p className="text-muted mb-0">Pick your resume and a job above, then press <strong>Check ATS match</strong>.</p>
            </div>
          )}
        </div>
        <aside className="col-xl-3 order-1 order-xl-2">
          <h2 className="sub-title">History</h2>
          <HistoryList
            basePath="/ats-checker" selectedId={selected?.row.id}
            items={history.map((h) => ({ id: h.id, score: h.score, createdAt: h.createdAt, title: h.jobTitle ?? "Pasted job", subtitle: h.jobCompany ?? undefined, demo: h.isDemo }))}
          />
        </aside>
      </div>
    </div>
  );
}
