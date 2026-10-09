import { scoreTone } from "@/lib/labels";

export function ProgressBar({
  value,
  label,
  showValue = true,
}: {
  value: number;
  label?: string;
  showValue?: boolean;
}) {
  return (
    <div>
      {(label || showValue) && (
        <div className="d-flex justify-content-between small mb-1">
          <span>{label}</span>
          {showValue && <strong>{value}%</strong>}
        </div>
      )}
      <div
        className="progress js-progress"
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`progress-bar tone-${scoreTone(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
