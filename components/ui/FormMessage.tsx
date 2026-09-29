import type { ActionState } from "@/types";

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div role={state.ok ? "status" : "alert"} className={`alert ${state.ok ? "alert-success" : "alert-danger"} py-2 mb-0`}>
      {state.message}
    </div>
  );
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const msg = state.errors?.[name]?.[0];
  return msg ? <div className="invalid-feedback d-block" id={`${name}-error`}>{msg}</div> : null;
}
