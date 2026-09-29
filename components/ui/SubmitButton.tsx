"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Saving…", className = "btn btn-brand" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
