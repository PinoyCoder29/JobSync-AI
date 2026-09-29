"use client";

import { STEP_LABELS, WizardStep } from "@/types/resume";

interface StepIndicatorProps {
  steps: WizardStep[];
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  disabled?: boolean;
}

export default function StepIndicator({ steps, currentStep, onStepClick, disabled }: StepIndicatorProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <ol className="step-rail" aria-label="Resume builder progress">
      {steps.map((step, idx) => {
        const isCurrent = step === currentStep;
        const isDone = idx < currentIndex;
        return (
          <li className="step-rail-item" key={step}>
            {idx > 0 && <div className="step-connector" aria-hidden="true" />}
            <button
              type="button"
              className="btn p-0 border-0 bg-transparent d-flex align-items-center gap-2"
              onClick={() => {
                onStepClick?.(step);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={!onStepClick || disabled}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Step ${idx + 1}: ${STEP_LABELS[step]}${isDone ? " (completed)" : ""}`}
            >
              <span className={`step-node ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}`}>
                {isDone ? <i className="bi bi-check-lg" aria-hidden="true" /> : idx + 1}
              </span>
              <span className={`step-label d-none d-md-inline ${isCurrent ? "is-current" : ""}`}>{STEP_LABELS[step]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
