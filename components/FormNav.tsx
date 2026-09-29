"use client";

import { useResume } from "@/context/ResumeContext";

interface FormNavProps {
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  backLabel?: string;
  nextLabel?: string;
  skipLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
  hideNext?: boolean;
}

export default function FormNav({
  onBack,
  onNext,
  onSkip,
  backLabel = "Back",
  nextLabel = "Continue",
  skipLabel = "Skip this section",
  nextDisabled = false,
  hideBack = false,
  hideNext = false,
}: FormNavProps) {
  const { saving } = useResume();
  if (hideBack && hideNext) return null;

  const withScroll = (fn?: () => void) => () => {
    fn?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-4 pt-3 border-top">
      {!hideBack ? (
        <button type="button" className="btn btn-outline-ink px-4" onClick={withScroll(onBack)} disabled={saving}>
          {backLabel}
        </button>
      ) : (
        <span />
      )}

      <div className="d-flex align-items-center gap-3">
        {onSkip && (
          <button type="button" className="btn btn-link text-secondary p-0" onClick={withScroll(onSkip)} disabled={saving}>
            {skipLabel}
          </button>
        )}

        {!hideNext && (
          <button type="button" className="btn btn-ink px-4" onClick={withScroll(onNext)} disabled={nextDisabled || saving} aria-busy={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                Saving…
              </>
            ) : (
              nextLabel
            )}
          </button>
        )}
      </div>
    </div>
  );
}
