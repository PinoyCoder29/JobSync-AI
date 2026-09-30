"use client";

import { FileDropzone } from "./FileDropzone";
import { SourceTabs } from "./SourceTabs";

export type JobSourceState = { source: "job" | "text" | "file"; jobId: string; text: string; file: File | null };
export const initialJobSource = (jobId: string): JobSourceState => ({ source: jobId ? "job" : "text", jobId, text: "", file: null });

export function jobSourceReady(s: JobSourceState): boolean {
  if (s.source === "job") return Boolean(s.jobId);
  if (s.source === "file") return s.file !== null;
  return s.text.trim().length >= 80;
}

export function appendJobFields(form: FormData, s: JobSourceState) {
  form.set("jobSource", s.source);
  if (s.source === "job") form.set("jobId", s.jobId);
  if (s.source === "text") form.set("jobText", s.text);
  if (s.source === "file" && s.file) form.set("jobFile", s.file);
}

export function JobSourcePicker({ value, onChange, jobs, disabled }: {
  value: JobSourceState; onChange: (v: JobSourceState) => void; jobs: { id: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <SourceTabs
        label="Where is the job description?" value={value.source} disabled={disabled}
        onChange={(source) => onChange({ ...value, source })}
        options={[
          { value: "job", label: "A JobSync job", icon: "bi-briefcase" },
          { value: "text", label: "Paste description", icon: "bi-clipboard" },
          { value: "file", label: "Upload file", icon: "bi-upload" },
        ]}
      />
      <div className="mt-3">
        {value.source === "job" && (
          <div>
            <label htmlFor="ats-job" className="form-label small fw-semibold">Job</label>
            <select id="ats-job" className="form-select" disabled={disabled} value={value.jobId} onChange={(e) => onChange({ ...value, jobId: e.target.value })}>
              <option value="">Select a job…</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
            </select>
            <div className="form-text">Your saved and tracked jobs are listed first.</div>
          </div>
        )}
        {value.source === "text" && (
          <div>
            <label htmlFor="job-paste" className="form-label small fw-semibold">Job description</label>
            <textarea id="job-paste" className="form-control" rows={9} disabled={disabled} value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} placeholder="Paste the full job posting: responsibilities, requirements, skills…" />
            <div className="form-text">{value.text.trim().length.toLocaleString()} characters{value.text.trim().length < 80 ? " · at least 80 needed" : ""}</div>
          </div>
        )}
        {value.source === "file" && <FileDropzone label="Drop the job description here" file={value.file} disabled={disabled} onFile={(file) => onChange({ ...value, file })} />}
      </div>
    </div>
  );
}
