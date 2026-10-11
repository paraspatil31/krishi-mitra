import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Textarea({ label, error, hint, id, className = "", ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        {...props}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 disabled:bg-[var(--muted)] disabled:cursor-not-allowed resize-y min-h-[80px] ${
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
