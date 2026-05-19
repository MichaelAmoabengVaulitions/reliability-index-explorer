import { type ReactNode } from 'react';

import styles from './Card.module.css';

interface CardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Screen-reader name for the card. Use this when no visible title is shown. */
  ariaLabel?: string;
}

/**
 * A boxed panel with an optional title bar (title on the left, action buttons
 * on the right) and a body that holds whatever children you pass in. Used
 * wherever a feature needs its own framed area on the dashboard.
 */
export function Card({ title, actions, children, ariaLabel }: CardProps) {
  return (
    <section className={styles.card} aria-label={ariaLabel ?? title}>
      {(title !== undefined || actions !== undefined) && (
        <header className={styles.header}>
          {title !== undefined && <h2 className={styles.title}>{title}</h2>}
          {actions !== undefined && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
