import { Outlet, useParams } from 'react-router-dom';

import { useSelectedUser } from '@/store/selectedUser';
import { useUrlSync } from '@/store/urlSync';

import { Sidebar } from './Sidebar';
import { UserPicker } from './UserPicker';

/**
 * The page frame every screen sits inside.
 *
 * On the left is the sidebar (logo, user picker, navigation). On the right
 * is the main content area: a small top bar with the current user and the
 * scoring window, then the per-page content underneath. We call useUrlSync
 * here so the URL and the stores start staying in step the moment the app
 * loads, before any feature is drawn.
 */
export function Root() {
  useUrlSync();
  const { userId } = useParams<{ userId: string }>();
  const fromDate = useSelectedUser((state) => state.from);

  return (
    <div className="flex h-full min-h-screen w-full bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h1 className="m-0 text-lg font-semibold text-slate-900">
              {userId !== undefined ? userId : 'Pick a user to begin'}
            </h1>
            <p className="m-0 text-xs text-slate-500">
              Scoring window ends {fromDate}
            </p>
          </div>
          {/* Mobile fallback so the picker is reachable on narrow screens where the sidebar is hidden. */}
          <div className="md:hidden">
            <UserPicker />
          </div>
        </header>
        <main className="flex-1 overflow-auto px-6 py-6">
          {userId === undefined ? (
            <p className="text-sm text-slate-600">
              Pick a user from the sidebar to load their reliability dashboard.
            </p>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
