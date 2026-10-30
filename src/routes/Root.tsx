import { Outlet } from 'react-router';

import { useDashboardParams } from '@/data/useDashboardParams';

import { ScoringDatePicker } from './ScoringDatePicker';
import { Sidebar } from './Sidebar';
import { UserPicker } from './UserPicker';

/**
 * The page frame every screen sits inside.
 *
 * On the left is the sidebar (logo, user picker, navigation). On the right
 * is the main content area: a small top bar with the current user and the
 * scoring window, then the per-page content underneath.
 */
export function Root() {
  const { userId } = useDashboardParams();
  const hasUser = userId.length > 0;

  return (
    <div className="flex h-full min-h-screen w-full bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h1 className="m-0 text-lg font-semibold text-slate-900">
              {hasUser ? userId : 'Pick a user to begin'}
            </h1>
          </div>
          {hasUser && <ScoringDatePicker />}
          {/* Mobile fallback so the picker is reachable on narrow screens where the sidebar is hidden. */}
          <div className="md:hidden">
            <UserPicker />
          </div>
        </header>
        <main className="flex-1 overflow-auto px-6 py-6">
          {hasUser ? (
            <Outlet />
          ) : (
            <p className="text-sm text-slate-600">
              Pick a user from the sidebar to load their reliability dashboard.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
