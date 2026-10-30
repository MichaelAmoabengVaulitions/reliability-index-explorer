import { useParams } from 'react-router';

import { Breakdown } from '@/features/breakdown/Breakdown';
import { Cashflow } from '@/features/cashflow/Cashflow';
import { Explanation } from '@/features/explanation/Explanation';
import { Overview } from '@/features/overview/Overview';
import { Explorer } from '@/features/transactions/Explorer';
import { ErrorBoundary } from '@/ui/ErrorBoundary';

/**
 * Dashboard view for a single user.
 *
 * Each feature sits inside its own error catcher tied to the user id, so one
 * feature crashing leaves the rest of the dashboard working, and picking a
 * different user clears whatever error was caught.
 */
export function Dashboard() {
  const { userId } = useParams<{ userId: string }>();

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
