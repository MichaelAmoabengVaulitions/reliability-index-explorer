import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Breakdown } from '@/features/breakdown/Breakdown';
import { Cashflow } from '@/features/cashflow/Cashflow';
import { Explanation } from '@/features/explanation/Explanation';
import { Overview } from '@/features/overview/Overview';
import { Explorer } from '@/features/transactions/Explorer';
import { useSelectedUser } from '@/store/selectedUser';
import { ErrorBoundary } from '@/ui/ErrorBoundary';

/**
 * Dashboard view for a single user.
 *
 * The user id comes from the URL (the :userId part in /users/:userId). We
 * copy it into the selected-user store so other code can read it directly
 * from the store, rather than each component having to ask the router.
 *
 * Each feature sits inside its own error boundary keyed on the user id, so
 * a single feature crashing keeps the rest of the dashboard up — and a fresh
 * pick of user clears whatever error was caught.
 */
export function Dashboard() {
  const { userId } = useParams<{ userId: string }>();
  const setUserId = useSelectedUser((state) => state.setUserId);

  useEffect(() => {
    if (userId !== undefined) setUserId(userId);
  }, [userId, setUserId]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-3">
        <ErrorBoundary resetKey={userId}>
          <Overview />
        </ErrorBoundary>
      </div>

      <div className="lg:col-span-2">
        <ErrorBoundary resetKey={userId}>
          <Breakdown />
        </ErrorBoundary>
      </div>

      <div className="lg:col-span-1">
        <ErrorBoundary resetKey={userId}>
          <Explanation />
        </ErrorBoundary>
      </div>

      <div className="lg:col-span-3">
        <ErrorBoundary resetKey={userId}>
          <Cashflow />
        </ErrorBoundary>
      </div>

      <div className="lg:col-span-3">
        <ErrorBoundary resetKey={userId}>
          <Explorer />
        </ErrorBoundary>
      </div>
    </div>
  );
}
