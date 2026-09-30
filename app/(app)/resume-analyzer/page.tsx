import type { Metadata } from "next";
import { HistoryList } from "@/components/analysis/HistoryList";
import { ResumeAnalyzerForm } from "@/components/analysis/ResumeAnalyzerForm";
import { ResumeReportView } from "@/components/analysis/ResumeReportView";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { requireUserId } from "@/lib/session";
import { isGeminiConfigured } from "@/services/analysis/gemini";
import { resumeAnalyzerService } from "@/services/analysis/resume-analyzer.service";
import { resumeReportSchema } from "@/services/analysis/schemas";
import { resumeService } from "@/services/resume.service";

export const metadata: Metadata = { title: "Resume analyzer" };

const SOURCE_LABEL: Record<string, string> = { builder: "JobSync resume", file: "Uploaded file", text: "Pasted text" };

export default async function ResumeAnalyzerPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const userId = await requireUserId();
  const { id } = await searchParams;
  const [history, { exists }] = await Promise.all([resumeAnalyzerService.history(userId), resumeService.getForEditor(userId)]);

  const selectedId = id ?? history[0]?.id;
  const selected = selectedId ? await resumeAnalyzerService.getOwned(userId, selectedId) : null; // null if it isn't yours
  const parsed = selected?.details ? resumeReportSchema.safeParse(selected.details.report) : null;

  return (
    <div className="d-grid gap-4">
      <header>
        <h1 className="page-title">Resume analyzer</h1>
        <p className="tool-tagline"><i className="bi bi-stars me-1" aria-hidden="true" />Improve my resume. No job needed: we review the resume itself.</p>
        <p className="text-muted mb-0">Looking to compare your resume with a specific job? Use the <a href="/ats-checker">ATS checker</a>.</p>
      </header>

      <ResumeAnalyzerForm hasBuilderResume={exists} aiReady={isGeminiConfigured()} hasResult={Boolean(selected)} />

      <div className="row g-4" id="results">
        <div className="col-xl-9 order-2 order-xl-1">
          {id && !selected && <div className="alert alert-warning" role="alert">We couldn't find that analysis.</div>}
          {selected && parsed?.success && selected.details && (
            <ResumeReportView report={parsed.data} createdAt={selected.row.createdAt} model={selected.row.model} truncated={selected.details.truncated} />
          )}
          {selected && !parsed?.success && (
            <div className="empty-state">
              <ScoreRing value={selected.row.score} label="Old demo score" size={110} />
              <h2 className="h5 mt-3">This is an older demo result</h2>
              <p className="text-muted mb-0">It was created before the AI analyzer existed and has no detailed report. Run a new analysis above.</p>
            </div>
          )}
          {!selected && !id && (
            <div className="empty-state">
              <i className="bi bi-stars" aria-hidden="true" />
              <h2 className="h5 mb-1">No analysis yet</h2>
              <p className="text-muted mb-0">Choose a resume above and press <strong>Analyze resume</strong>. Results are saved to your account.</p>
            </div>
          )}
        </div>
        <aside className="col-xl-3 order-1 order-xl-2">
          <h2 className="sub-title">History</h2>
          <HistoryList
            basePath="/resume-analyzer" selectedId={selected?.row.id}
            items={history.map((h) => ({ id: h.id, score: h.score, createdAt: h.createdAt, title: SOURCE_LABEL[h.sourceType] ?? "Analysis", demo: h.isDemo }))}
          />
        </aside>
      </div>
    </div>
  );
}
