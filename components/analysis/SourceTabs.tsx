"use client";

export function SourceTabs<T extends string>({ label, value, onChange, options, disabled }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; icon: string }[]; disabled?: boolean;
}) {
  return (
    <div className="source-tabs" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} disabled={disabled} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)}>
          <i className={`bi ${o.icon}`} aria-hidden="true" /> {o.label}
        </button>
      ))}
    </div>
  );
}
