"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ActionState } from "@/types";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  pendingText?: string;
  icon?: string;
  className?: string;
  /** Asks the browser to confirm first (used for destructive actions like blocking). */
  confirm?: string;
};

/** One small form per action: works without client state, shows the server's message inline and announces it to screen readers. */
export function ActionButton({ action, fields, label, pendingText = "Working…", icon, className = "btn btn-outline-brand btn-sm", confirm }: Props) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="action-form"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton className={className} pendingText={pendingText}>
        {icon && <i className={`bi ${icon} me-1`} aria-hidden="true" />}
        {label}
      </SubmitButton>
      {state.message && (
        <span role={state.ok ? "status" : "alert"} className={`action-message small ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
