interface ErrorMessageProps {
  message: string;
  className?: string;
}

export default function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 ${className}`}
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}
