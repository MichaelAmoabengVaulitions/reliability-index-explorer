import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { fetchAvailableUserIds } from '@/api/client';

const DISCOVERY_QUERY_KEY = ['discovery', 'userIds'] as const;

/**
 * Dropdown that lists every user id the backend's discovery endpoint
 * reports. Picking one takes the visitor to that user's dashboard.
 *
 * The network call lives directly in this component because this is the
 * only place that needs it. It still goes through React Query so the
 * loading and error behaviour matches the rest of the app.
 */
export function UserPicker() {
  const navigate = useNavigate();
  const { userId: currentUserId } = useParams<{ userId: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: DISCOVERY_QUERY_KEY,
    queryFn: fetchAvailableUserIds,
  });

  if (isLoading) {
    return <p className="px-3 text-sm text-sidebar-muted">Loading users…</p>;
  }
  if (error !== null) {
    return (
      <p role="alert" className="px-3 text-sm text-red-300">
        Could not load users
      </p>
    );
  }

  return (
    <label className="block">
      <span className="sr-only">Select a user</span>
      <span className="relative block">
        <select
          value={currentUserId ?? ''}
          onChange={(event) => navigate(`/users/${event.target.value}`)}
          className="block w-full appearance-none rounded-md border border-sidebar-border bg-sidebar-hover px-3 py-2 pr-9 text-sm text-white shadow-sm focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
        >
          <option value="" disabled>
            Choose a user…
          </option>
          {data?.map((id) => (
            <option key={id} value={id} className="bg-slate-900 text-white">
              {id}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-muted"
        />
      </span>
    </label>
  );
}
