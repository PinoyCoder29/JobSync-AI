"use client";

import { useEffect } from "react";

/** Last-resort boundary for pages inside the app shell. Technical details stay in the server logs, never on screen. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="empty-state error" role="alert">
      <i className="bi bi-exclamation-circle" aria-hidden="true" />
      <h1 className="h5">Something went wrong.</h1>
      <p className="text-muted">We couldn&apos;t load this page. Please try again.</p>
      <button type="button" className="btn btn-brand" onClick={reset}>Try again</button>
    </div>
  );
}
