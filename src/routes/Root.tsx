import { Outlet, useParams } from 'react-router-dom';

import { useUrlSync } from '@/store/urlSync';

import styles from './Root.module.css';
import { UserPicker } from './UserPicker';

/**
 * The page frame every screen sits inside.
 *
 * Has the header on top (app title and the user picker on the right) and
 * the per-page content below. We call useUrlSync here so the URL and the
 * in-memory stores start staying in step the moment the app loads, before
 * any feature is drawn.
 */
export function Root() {
  useUrlSync();
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reliability Index Explorer</h1>
        <UserPicker />
      </header>
      <main className={styles.main}>
        {userId === undefined ? (
          <p className={styles.welcome}>Pick a user to begin.</p>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
