"use client";

import { useId, useRef, useState } from "react";

const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS = ["pdf", "docx", "txt"];

export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONS.includes(ext)) return ext === "doc" ? "Old .doc files aren't supported. Save as .docx or PDF." : "Unsupported file type. Use PDF, DOCX or TXT.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_BYTES) return "That file is too large. The limit is 4 MB.";
  return null;
}

const size = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function FileDropzone({ label, file, onFile, disabled }: { label: string; file: File | null; onFile: (f: File | null) => void; disabled?: boolean }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (f: File | undefined) => {
    if (!f) return;
    const problem = validateFile(f);
    setError(problem);
    onFile(problem ? null : f);
  };

  return (
    <div>
      <div
        className={`dropzone ${dragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) accept(e.dataTransfer.files[0]); }}
      >
        <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
        {file ? (
          <div className="text-center">
            <p className="fw-semibold mb-0 text-break">{file.name}</p>
            <p className="small text-muted mb-2">{size(file.size)}</p>
            <button type="button" className="btn btn-outline-brand btn-sm" disabled={disabled} onClick={() => { onFile(null); setError(null); if (inputRef.current) inputRef.current.value = ""; }}>
              Remove file
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="fw-semibold mb-1">{label}</p>
            <p className="small text-muted mb-2">Drag and drop here, or</p>
            <label htmlFor={inputId} className={`btn btn-brand btn-sm ${disabled ? "disabled" : ""}`}>Browse files</label>
            <p className="small text-muted mt-2 mb-0">PDF, DOCX or TXT · up to 4 MB</p>
          </div>
        )}
        <input
          ref={inputRef} id={inputId} type="file" className="visually-hidden" disabled={disabled}
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-danger small mt-2 mb-0" role="alert"><i className="bi bi-exclamation-circle me-1" aria-hidden="true" />{error}</p>}
    </div>
  );
}
