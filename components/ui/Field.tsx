import type { ActionState } from "@/types";
import { FieldError } from "./FormMessage";

type Props = {
  label: string;
  name: string;
  state: ActionState;
  as?: "input" | "textarea" | "select";
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  hint?: string;
  autoComplete?: string;
  children?: React.ReactNode;
  className?: string;
};

export function Field({ label, name, state, as = "input", type = "text", defaultValue, placeholder, required, rows = 3, hint, autoComplete, children, className = "mb-3" }: Props) {
  const invalid = Boolean(state.errors?.[name]?.length);
  const common = {
    id: name, name, required, "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${name}-error` : hint ? `${name}-hint` : undefined,
    className: `${as === "select" ? "form-select" : "form-control"} ${invalid ? "is-invalid" : ""}`,
  };
  return (
    <div className={className}>
      <label htmlFor={name} className="form-label fw-semibold small">{label}{required && <span aria-hidden="true"> *</span>}</label>
      {as === "textarea" ? (
        <textarea {...common} rows={rows} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
      ) : as === "select" ? (
        <select {...common} defaultValue={defaultValue ?? ""}>{children}</select>
      ) : (
        <input {...common} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} autoComplete={autoComplete} />
      )}
      {hint && !invalid && <div className="form-text" id={`${name}-hint`}>{hint}</div>}
      <FieldError state={state} name={name} />
    </div>
  );
}
