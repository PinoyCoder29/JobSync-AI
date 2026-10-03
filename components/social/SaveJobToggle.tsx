"use client";

import { useState, useTransition } from "react";
import { del, postJson } from "@/lib/client/api";

/** Optimistic save/unsave that talks to the JSON API (same SavedJob table as the rest of the app). */
export function SaveJobToggle({ jobId, saved: initial, className = "btn btn-sm btn-outline-brand", onChange }: { jobId: string; saved: boolean; className?: string; onChange?: (saved: boolean) => void }) {
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    setError(null);
    start(async () => {
      try {
        await (next ? postJson(`/api/jobs/${jobId}/save`) : del(`/api/jobs/${jobId}/save`));
        onChange?.(next);
      } catch (e) {
        setSaved(!next);
        setError(e instanceof Error ? e.message : "Couldn't update. Try again.");
      }
    });
  }

  return (
    <>
      <button type="button" className={`${className} ${saved ? "is-saved" : ""}`} onClick={toggle} disabled={pending} aria-pressed={saved}>
        <i className={`bi ${saved ? "bi-bookmark-fill" : "bi-bookmark"} me-1`} aria-hidden="true" />
        {saved ? "Saved" : "Save"}
      </button>
      {error && <span role="alert" className="small text-danger ms-2">{error}</span>}
    </>
  );
}
