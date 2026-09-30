"use client";

import { FileDropzone } from "./FileDropzone";
import { SourceTabs } from "./SourceTabs";

export type ResumeSourceState = { source: "builder" | "file" | "text"; file: File | null; text: string };
export const initialResumeSource = (hasBuilderResume: boolean): ResumeSourceState => ({ source: hasBuilderResume ? "builder" : "file", file: null, text: "" });

export function resumeSourceReady(s: ResumeSourceState, hasBuilderResume: boolean): boolean {
  if (s.source === "builder") return hasBuilderResume;
  if (s.source === "file") return s.file !== null;
  return s.text.trim().length >= 150;
}

export function appendResumeFields(form: FormData, s: ResumeSourceState) {
  form.set("resumeSource", s.source);
  if (s.source === "file" && s.file) form.set("resumeFile", s.file);
  if (s.source === "text") form.set("resumeText", s.text);
}

export function ResumeSourcePicker({ value, onChange, hasBuilderResume, disabled }: {
  value: ResumeSourceState; onChange: (v: ResumeSourceState) => void; hasBuilderResume: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <SourceTabs
        label="Where is your resume?" value={value.source} disabled={disabled}
        onChange={(source) => onChange({ ...value, source })}
        options={[
          { value: "builder", label: "My JobSync resume", icon: "bi-file-earmark-person" },
          { value: "file", label: "Upload a file", icon: "bi-upload" },
          { value: "text", label: "Paste text", icon: "bi-clipboard" },
        ]}
      />
      <div className="mt-3">
        {value.source === "builder" && (
          hasBuilderResume ? (
            <p className="mb-0"><i className="bi bi-check-circle text-success me-1" aria-hidden="true" />Your saved resume from the Resume Builder will be used.</p>
          ) : (
            <p className="mb-0 text-muted">You haven't built a resume yet. <a href="/resume">Open the Resume Builder</a>, or upload / paste one instead.</p>
          )
        )}
        {value.source === "file" && <FileDropzone label="Drop your resume here" file={value.file} disabled={disabled} onFile={(file) => onChange({ ...value, file })} />}
        {value.source === "text" && (
          <div>
            <label htmlFor="resume-paste" className="form-label small fw-semibold">Resume text</label>
            <textarea id="resume-paste" className="form-control" rows={9} disabled={disabled} value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} placeholder="Paste the full text of your resume here…" />
            <div className="form-text">{value.text.trim().length.toLocaleString()} characters{value.text.trim().length < 150 ? " · at least 150 needed" : ""}</div>
          </div>
        )}
      </div>
    </div>
  );
}
