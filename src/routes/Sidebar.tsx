import { Activity, LayoutDashboard } from 'lucide-react';

import { UserPicker } from './UserPicker';

/**
 * The left-hand navigation column. It holds the logo, the user picker and the
 * navigation links. "Dashboard" is the only link today; it is kept as a
 * styled list so more sections (Reports, Settings) can be added later without
 * rearranging the sidebar.
 */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-text md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-white">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold text-white">Reliability Index</span>
      </div>

      <div className="mb-6 px-2">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sidebar-muted">
          User
        </p>
        <UserPicker />
      </div>

      <nav aria-label="Main">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-sidebar-muted">
          Sections
        </p>
        <ul className="space-y-1">
          <li>
            <span
              aria-current="page"
              className="flex items-center gap-3 rounded-md bg-sidebar-active/20 px-3 py-2 text-sm font-medium text-white"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </span>
          </li>
        </ul>
      </nav>

      <div className="mt-auto pt-6">
        <p className="px-2 text-xs text-sidebar-muted">v0.1 analyst preview</p>
      </div>
    </aside>
  );
}
