"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { appendResumeFields, initialResumeSource, ResumeSourcePicker, resumeSourceReady } from "./ResumeSourcePicker";
import { RunProgress } from "./RunProgress";
import { useAnalysisRunner } from "./useAnalysisRunner";

export function ResumeAnalyzerForm({ hasBuilderResume, aiReady, hasResult }: { hasBuilderResume: boolean; aiReady: boolean; hasResult: boolean }) {
  const router = useRouter();
  const [src, setSrc] = useState(() => initialResumeSource(hasBuilderResume));
  const { state, run, reset } = useAnalysisRunner("/api/resume/analyze");
  const running = state.status === "running";
  const ready = aiReady && resumeSourceReady(src, hasBuilderResume);

  async function submit(force: boolean) {
    if (!ready || running) return;
    const form = new FormData();
    appendResumeFields(form, src);
    if (force) form.set("force", "true");
    const result = await run(form, src.source === "file");
    if (result) {
      router.push(`/resume-analyzer?id=${result.id}#results`);
      router.refresh();
    }
  }

  return (
    <div className="tool-panel">
      <h2 className="section-title">1. Choose your resume</h2>
      <ResumeSourcePicker value={src} onChange={(v) => { reset(); setSrc(v); }} hasBuilderResume={hasBuilderResume} disabled={running} />

      {!aiReady && <div className="alert alert-warning mt-3 mb-0" role="alert">AI analysis isn't set up on this server yet. Add <code>GEMINI_API_KEY</code> to <code>.env</code> and restart.</div>}
      {state.status === "error" && <div className="alert alert-danger mt-3 mb-0" role="alert"><i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />{state.error}</div>}

      <div className="d-flex flex-wrap align-items-center gap-2 mt-4">
        <button type="button" className="btn btn-brand" onClick={() => submit(false)} disabled={!ready || running} aria-busy={running}>
          {running ? "Analyzing…" : "Analyze resume"}
        </button>
        {hasResult && (
          <button type="button" className="btn btn-outline-brand" onClick={() => submit(true)} disabled={!ready || running} title="Ignore any saved result and run a fresh analysis">
            <i className="bi bi-arrow-repeat me-1" aria-hidden="true" />Analyze again
          </button>
        )}
      </div>
      <RunProgress state={state} mode="resume" hasUpload={src.source === "file"} />
    </div>
  );
}
  