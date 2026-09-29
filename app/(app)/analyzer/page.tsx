import type { Metadata } from "next";
import Link from "next/link";
import { runResumeAnalysisAction } from "@/app/actions/analysis.actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageMessage } from "@/components/ui/PageMessage";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDate } from "@/lib/labels";
import { requireUserId } from "@/lib/session";
import { analysisService, type SectionScore } from "@/services/analysis.service";
import { resumeService } from "@/services/resume.service";

export const metadata: Metadata = { title: "Resume analyzer" };

export default async function AnalyzerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const userId = await requireUserId();
  const { error } = await searchParams;
  const [analysis, { exists }] = await Promise.all([analysisService.latestResumeAnalysis(userId), resumeService.getForEditor(userId)]);
  const sections = (analysis?.sections ?? []) as SectionScore[];

  return (
    <div className="d-grid gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <h1 className="page-title">Resume analyzer <span className="demo-tag">Demo analysis</span></h1>
          <p className="text-muted mb-0">Rule-based feedback on your saved resume. No AI model is connected yet, so treat it as a checklist, not a verdict.</p>
        </div>
        {exists && (
          <form action={runResumeAnalysisAction}>
            <SubmitButton pendingText="Analyzing…">{analysis ? "Re-run analysis" : "Analyze my resume"}</SubmitButton>
          </form>
        )}
      </div>
      <PageMessage message={error} />

      {!exists ? (
        <EmptyState icon="bi-file-earmark-person" title="Build your resume first" text="The analyzer reads your saved resume, so it needs something to look at." href="/resume" actionLabel="Open resume builder" />
      ) : !analysis ? (
        <EmptyState icon="bi-stars" title="No analysis yet" text="Run the analysis to see your score, strengths and what to improve." />
      ) : (
        <>
          <section className="d-flex flex-wrap align-items-center gap-4">
            <ScoreRing value={analysis.score} label="Resume score" size={140} />
            <div>
              <p className="match-big mb-0">{analysis.score} <span className="fs-5 text-muted">/ 100</span></p>
              <p className="text-muted mb-0">Analyzed {formatDate(analysis.createdAt)} · {analysis.isDemo ? "demo provider" : analysis.provider}</p>
            </div>
          </section>

          <section>
            <h2 className="section-title">Section analysis</h2>
            <div className="row g-3">{sections.map((s) => <div className="col-md-6" key={s.label}><ProgressBar value={s.score} label={s.label} /></div>)}</div>
          </section>

          <div className="row g-4">
            <section className="col-md-6"><h2 className="section-title">Strengths</h2><ul className="check-list good">{analysis.strengths.map((s) => <li key={s}>{s}</li>)}</ul></section>
            <section className="col-md-6"><h2 className="section-title">Weaknesses</h2>{analysis.weaknesses.length ? <ul className="check-list warn">{analysis.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-muted">Nothing major flagged.</p>}</section>
          </div>

          <section>
            <h2 className="section-title">Recommended actions</h2>
            <ol className="action-list">{analysis.suggestions.map((s) => <li key={s}>{s}</li>)}</ol>
            <p className="mb-0"><Link href="/resume">Edit your resume</Link></p>
          </section>

          <section>
            <h2 className="section-title">Keyword analysis</h2>
            <h3 className="sub-title">Found in your resume</h3>
            <div className="d-flex flex-wrap gap-1 mb-3">{analysis.keywordsFound.length ? analysis.keywordsFound.map((k) => <SkillBadge key={k} name={k} tone="have" />) : <span className="text-muted small">None of the tracked keywords yet.</span>}</div>
            <h3 className="sub-title">Worth adding if they're true for you</h3>
            <div className="d-flex flex-wrap gap-1">{analysis.keywordsSuggested.map((k) => <SkillBadge key={k} name={k} tone="missing" />)}</div>
          </section>
        </>
      )}
    </div>
  );
}
