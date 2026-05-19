interface ErrorStateProps {
  title: string;
  description?: string;
  /** Called when the visitor clicks the retry button. The button only appears when this is set. */
  onRetry?: () => void;
  /** Custom wording for the retry button. */
  retryLabel?: string;
}

/**
 * Shown when something failed and the visitor can try again. When the parent
 * passes onRetry, the button gives them a way forward — never a dead end
 * (CLAUDE.md rule 6).
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
    >
      <p className="m-0 text-base font-semibold">{title}</p>
      {description !== undefined && (
        <p className="m-0 text-sm text-red-800">{description}</p>
      )}
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
