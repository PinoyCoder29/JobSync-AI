import type { RunStage, RunState } from "./useAnalysisRunner";

const STEPS: { stage: RunStage; label: string; only?: "ats" | "file" }[] = [
  { stage: "uploading", label: "Uploading", only: "file" },
  { stage: "reading", label: "Reading resume" },
  { stage: "extracting", label: "Extracting content" },
  { stage: "comparing", label: "Comparing requirements", only: "ats" },
  { stage: "analyzing", label: "Analyzing and generating recommendations" },
  { stage: "saving", label: "Saving results" },
];
const ORDER: RunStage[] = ["uploading", "reading", "extracting", "comparing", "analyzing", "saving"];

export function RunProgress({ state, mode, hasUpload }: { state: RunState; mode: "resume" | "ats"; hasUpload: boolean }) {
  if (state.status !== "running" || !state.stage) return null;
  const current = ORDER.indexOf(state.stage);
  const steps = STEPS.filter((s) => (s.only === "ats" ? mode === "ats" : s.only === "file" ? hasUpload : true));

  return (
    <div className="run-progress" role="status" aria-live="polite">
      <p className="fw-semibold mb-2">Working on it… this usually takes 10–30 seconds.</p>
      <ol className="run-steps">
        {steps.map((s) => {
          const idx = ORDER.indexOf(s.stage);
          const done = idx < current;
          const active = idx === current;
          return (
            <li key={s.stage} className={done ? "done" : active ? "active" : ""} aria-current={active ? "step" : undefined}>
              {done ? <i className="bi bi-check-circle-fill" aria-hidden="true" /> : active ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <i className="bi bi-circle" aria-hidden="true" />}
              <span>{s.label}{s.stage === "uploading" && state.uploadPct !== null ? ` (${state.uploadPct}%)` : ""}</span>
              <span className="visually-hidden">{done ? " done" : active ? " in progress" : " waiting"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
