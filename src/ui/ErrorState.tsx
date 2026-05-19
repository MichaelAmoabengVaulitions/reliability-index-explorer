import styles from './ErrorState.module.css';

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
    <div className={styles.error} role="alert">
      <p className={styles.title}>{title}</p>
      {description !== undefined && <p className={styles.description}>{description}</p>}
      {onRetry !== undefined && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
