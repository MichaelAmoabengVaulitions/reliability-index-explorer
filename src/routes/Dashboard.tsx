import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useSelectedUser } from '@/store/selectedUser';

import styles from './Dashboard.module.css';

// Each entry is a feature that will replace its placeholder card in later work.
const PLACEHOLDER_FEATURES = [
  'Reliability Overview',
  'Score Breakdown',
  'Score Drivers',
  'Monthly Cashflow',
  'Transactions',
] as const;

/**
 * Dashboard view for a single user.
 *
 * The user id comes from the URL (the :userId part in /users/:userId). We
 * copy it into the selected-user store so other code can read it directly
 * from the store, rather than each component having to ask the router.
 */
export function Dashboard() {
  const { userId } = useParams<{ userId: string }>();
  const setUserId = useSelectedUser((state) => state.setUserId);

  useEffect(() => {
    if (userId !== undefined) setUserId(userId);
  }, [userId, setUserId]);

  return (
    <div className={styles.grid}>
      {PLACEHOLDER_FEATURES.map((title) => (
        <section key={title} className={styles.placeholder} aria-label={title}>
          <h2 className={styles.placeholderTitle}>{title}</h2>
          <p className={styles.placeholderText}>Coming soon</p>
        </section>
      ))}
    </div>
  );
}
