import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { fetchAllTransactions } from '@/api/client';

import { queryKeys } from './queryKeys';
import { toState, type TransactionState } from './transactionState';

/**
 * What useTransactions stores in the React Query cache while loading and once done.
 *
 * `state` is the normalized transactions (built up only at the end). `loaded` and
 * `total` track progress through the cursor pagination so the UI can render a
 * "loaded N of M" indicator before every page arrives.
 */
export interface TransactionsQueryData {
  state: TransactionState;
  loaded: number;
  total: number;
}

const EMPTY_TRANSACTIONS_DATA: TransactionsQueryData = {
  state: toState([]),
  loaded: 0,
  total: 0,
};

/**
 * Fetches every transaction page for a user and window, normalising the result
 * for cheap lookups by id.
 *
 * Each page's progress counts are written back into the same cache entry via
 * setQueryData, so any subscribed component re-renders with the latest "N of M"
 * even while the query is still fetching.
 */
export function useTransactions(
  userId: string,
  from: string,
  to: string,
): UseQueryResult<TransactionsQueryData, Error> {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.transactions(userId, from, to);

  return useQuery<TransactionsQueryData, Error>({
    queryKey,
    // Skip the fetch when there is no user or no window date yet, so we do
    // not hit "/api/users//transactions" while the URL or store is hydrating.
    enabled: userId.length > 0 && from.length > 0 && to.length > 0,
    queryFn: async () => {
      const transactions = await fetchAllTransactions({
        userId,
        from,
        to,
        onProgress: (loaded, total) => {
          queryClient.setQueryData<TransactionsQueryData>(queryKey, (previous) => ({
            state: previous?.state ?? EMPTY_TRANSACTIONS_DATA.state,
            loaded,
            total,
          }));
        },
      });
      return {
        state: toState(transactions),
        loaded: transactions.length,
        total: transactions.length,
      };
    },
  });
}
