"use client";

import { useState } from "react";

/** Uses the native share sheet when available (mobile), otherwise copies the link. */
export function ShareJobButton({ jobId, title, className = "btn btn-sm btn-outline-brand" }: { jobId: string; title: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function share() {
    const url = `${window.location.origin}/jobs/${jobId}`;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      if ((e as Error).name !== "AbortError") { setState("failed"); setTimeout(() => setState("idle"), 2500); }
    }
  }
  return (
    <button type="button" className={className} onClick={share}>
      <i className="bi bi-share me-1" aria-hidden="true" />
      {state === "copied" ? "Link copied" : state === "failed" ? "Couldn't copy" : "Share"}
      <span className="visually-hidden" role="status">{state === "copied" ? "Link copied to clipboard" : ""}</span>
    </button>
  );
}
