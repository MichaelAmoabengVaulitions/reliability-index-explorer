import { type ReactNode } from 'react';

import styles from './EmptyState.module.css';

interface EmptyStateProps {
  /** Optional emoji or icon. It is decoration only — screen readers skip it. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Optional button or link the visitor can click to do something next. */
  action?: ReactNode;
}

/**
 * Shown when a feature has nothing to display — for example, no transactions
 * match the current filters, or no user is selected yet. Lets the parent
 * include an action so the visitor has a next step rather than a dead end.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon !== undefined && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <p className={styles.title}>{title}</p>
      {description !== undefined && <p className={styles.description}>{description}</p>}
      {action !== undefined && <div className={styles.action}>{action}</div>}
    </div>
  );
}
