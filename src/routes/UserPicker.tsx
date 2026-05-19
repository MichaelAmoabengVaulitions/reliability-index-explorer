import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchAvailableUserIds } from '@/api/client';
import styles from './UserPicker.module.css';

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
    return <span className={styles.status}>Loading users…</span>;
  }
  if (error !== null) {
    return (
      <span className={styles.status} role="alert">
        Could not load users
      </span>
    );
  }

  return (
    <label className={styles.picker}>
      <span className={styles.visuallyHidden}>Select a user</span>
      <select
        className={styles.select}
        value={currentUserId ?? ''}
        onChange={(event) => navigate(`/users/${event.target.value}`)}
      >
        <option value="" disabled>
          Choose a user…
        </option>
        {data?.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
    </label>
  );
}
