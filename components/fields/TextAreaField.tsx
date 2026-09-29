"use client";

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  colClass?: string;
  helpText?: string;
}

export default function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
  colClass = "col-12",
  helpText,
}: TextAreaFieldProps) {
  return (
    <div className={colClass}>
      <label className="form-label">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <textarea
        className="form-control"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
}
