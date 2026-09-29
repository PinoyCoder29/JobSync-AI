"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty-state error" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <h1 className="h5">Something went wrong</h1>
      <p className="text-muted">We couldn't load this page. Your data is safe. Try again in a moment.</p>
      <button type="button" className="btn btn-brand" onClick={reset}>Try again</button>
    </div>
  );
}
