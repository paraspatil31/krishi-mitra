import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 disabled:bg-[var(--muted)] disabled:cursor-not-allowed ${
          error
            ? "border-red-400 focus:ring-red-400"
            : "border-[var(--border)] hover:border-[var(--primary)]"
        } ${className}`}
      />
      {hint && !error && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
