"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client/api";
import { INTERVIEW_TYPES, type InterviewTypeKey } from "@/lib/interview-types";
import type { LiveStateDTO } from "@/services/interview/live-interview.service";

export function LiveInterviewSetup({ jobs, defaultType }: { jobs: { id: string; title: string; company: string }[]; defaultType: InterviewTypeKey }) {
  const router = useRouter();
  const [type, setType] = useState<InterviewTypeKey>(defaultType);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [length, setLength] = useState(6);
  const [jobId, setJobId] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await postJson<LiveStateDTO & { greeting: string }>("/api/interview/live", { type, difficulty, length, jobId: jobId || undefined, jobDescription: !jobId && desc.trim() ? desc : undefined });
      try { sessionStorage.setItem(`jobsync:greeting:${data.sessionId}`, data.greeting); } catch { /* optional */ }
      router.push(`/interview/live/${data.sessionId}`); // client-side navigation keeps the click, so the browser lets the AI speak
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't start the interview.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={start} className="live-setup">
      <fieldset>
        <legend className="h6">Interview type</legend>
        <div className="type-grid">
          {(Object.entries(INTERVIEW_TYPES) as [InterviewTypeKey, (typeof INTERVIEW_TYPES)[InterviewTypeKey]][]).map(([key, t]) => (
            <label key={key} className={`type-card ${type === key ? "on" : ""}`}>
              <input type="radio" name="type" value={key} checked={type === key} onChange={() => setType(key)} className="visually-hidden" />
              <i className={`bi ${t.icon}`} aria-hidden="true" />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="row g-3 mt-1">
        <div className="col-sm-6"><label className="form-label" htmlFor="lv-diff">Difficulty</label>
          <select id="lv-diff" className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></div>
        <div className="col-sm-6"><label className="form-label" htmlFor="lv-len">Questions</label>
          <select id="lv-len" className="form-select" value={length} onChange={(e) => setLength(Number(e.target.value))}>{[3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}</select></div>
      </div>

      <div className="mt-3">
        <label className="form-label" htmlFor="lv-job">Tailor to a job {type === "CUSTOM_JOB" ? "(required)" : "(optional)"}</label>
        <select id="lv-job" className="form-select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">{type === "CUSTOM_JOB" ? "Choose a job or paste a description below" : "No specific job"}</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company}</option>)}
        </select>
        {!jobId && (type === "CUSTOM_JOB" || desc) && <>
          <label className="form-label mt-2" htmlFor="lv-desc">…or paste a job description</label>
          <textarea id="lv-desc" className="form-control" rows={4} maxLength={6000} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </>}
        {!jobId && type !== "CUSTOM_JOB" && !desc && <button type="button" className="btn btn-link btn-sm px-0" onClick={() => setDesc(" ")}>Paste a job description instead</button>}
      </div>

      {error && <p role="alert" className="text-danger mt-3 mb-0">{error}</p>}
      <button type="submit" className="btn btn-brand btn-lg w-100 mt-4" disabled={busy}>{busy ? "Preparing your interviewer…" : <><i className="bi bi-mic me-2" aria-hidden="true" />Start Interview</>}</button>
    </form>
  );
}
