import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';

import {
  DEFAULT_FILTERS,
  readFilters,
  readFrom,
  writeFilters,
  type TransactionFilters,
} from '@/domain/dashboardParams';

interface DashboardParams {
  /** Empty when no user has been picked yet. */
  userId: string;
  from: string;
  filters: TransactionFilters;
  updateFilters: (changes: Partial<TransactionFilters>) => void;
  resetFilters: () => void;
}

/**
 * What the analyst is looking at, read from the URL: the user from the path,
 * and the date, filters and sort from the query string.
 *
 * Filter changes replace the current history entry, so the back button goes
 * to the previous page rather than undoing filters one at a time.
 */
export function useDashboardParams(): DashboardParams {
  const { userId = '' } = useParams<{ userId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const from = readFrom(searchParams);
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const updateFilters = useCallback(
    (changes: Partial<TransactionFilters>) => {
      void setSearchParams(
        (currentParams) =>
          writeFilters(currentParams, { ...readFilters(currentParams), ...changes }),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => updateFilters(DEFAULT_FILTERS), [updateFilters]);

  return { userId, from, filters, updateFilters, resetFilters };
}
