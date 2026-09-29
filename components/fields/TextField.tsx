"use client";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  colClass?: string;
  helpText?: string;
}

// Reused by every form (personal info, experience, education) so every
// input in the app looks and behaves identically.
export default function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  colClass = "col-12",
  helpText,
}: TextFieldProps) {
  return (
    <div className={colClass}>
      <label className="form-label">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type={type}
        className="form-control"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
}
