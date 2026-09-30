"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { appendJobFields, initialJobSource, JobSourcePicker, jobSourceReady } from "./JobSourcePicker";
import { appendResumeFields, initialResumeSource, ResumeSourcePicker, resumeSourceReady } from "./ResumeSourcePicker";
import { RunProgress } from "./RunProgress";
import { useAnalysisRunner } from "./useAnalysisRunner";

export function ATSCheckerForm({ hasBuilderResume, aiReady, hasResult, jobs, defaultJobId }: {
  hasBuilderResume: boolean; aiReady: boolean; hasResult: boolean; jobs: { id: string; label: string }[]; defaultJobId: string;
}) {
  const router = useRouter();
  const [resume, setResume] = useState(() => initialResumeSource(hasBuilderResume));
  const [job, setJob] = useState(() => initialJobSource(defaultJobId));
  const { state, run, reset } = useAnalysisRunner("/api/ats/analyze");
  const running = state.status === "running";
  const ready = aiReady && resumeSourceReady(resume, hasBuilderResume) && jobSourceReady(job);
  const hasUpload = resume.source === "file" || job.source === "file";

  async function submit(force: boolean) {
    if (!ready || running) return;
    const form = new FormData();
    appendResumeFields(form, resume);
    appendJobFields(form, job);
    if (force) form.set("force", "true");
    const result = await run(form, hasUpload);
    if (result) {
      router.push(`/ats-checker?id=${result.id}#results`);
      router.refresh();
    }
  }

  return (
    <div className="tool-panel">
      <div className="row g-4">
        <div className="col-lg-6">
          <h2 className="section-title">1. Your resume</h2>
          <ResumeSourcePicker value={resume} onChange={(v) => { reset(); setResume(v); }} hasBuilderResume={hasBuilderResume} disabled={running} />
        </div>
        <div className="col-lg-6">
          <h2 className="section-title">2. The job</h2>
          <JobSourcePicker value={job} onChange={(v) => { reset(); setJob(v); }} jobs={jobs} disabled={running} />
        </div>
      </div>

      {!aiReady && <div className="alert alert-warning mt-3 mb-0" role="alert">AI analysis isn't set up on this server yet. Add <code>GEMINI_API_KEY</code> to <code>.env</code> and restart.</div>}
      {state.status === "error" && <div className="alert alert-danger mt-3 mb-0" role="alert"><i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />{state.error}</div>}

      <div className="d-flex flex-wrap align-items-center gap-2 mt-4">
        <button type="button" className="btn btn-brand" onClick={() => submit(false)} disabled={!ready || running} aria-busy={running}>
          {running ? "Checking…" : "Check ATS match"}
        </button>
        {hasResult && (
          <button type="button" className="btn btn-outline-brand" onClick={() => submit(true)} disabled={!ready || running} title="Ignore any saved result and run a fresh check">
            <i className="bi bi-arrow-repeat me-1" aria-hidden="true" />Check again
          </button>
        )}
      </div>
      <RunProgress state={state} mode="ats" hasUpload={hasUpload} />
    </div>
  );
}
