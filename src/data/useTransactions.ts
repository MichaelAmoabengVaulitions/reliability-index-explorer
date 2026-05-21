import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { fetchAllTransactions } from '@/api/client';

import { queryKeys } from './queryKeys';
import { toState, type TransactionState } from './transactionState';

/**
 * What useTransactions keeps in the React Query cache while loading and once
 * done.
 *
 * `state` holds the transactions, arranged so one can be found straight away
 * by its id. `loaded` and `total` track how far the page-by-page load has
 * got, so the screen can show a "loaded N of M" line before every page has
 * arrived.
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
 * Fetches every page of transactions for a user and window, and arranges the
 * result so a transaction can be found straight away by its id.
 *
 * After each page, the progress counts are saved back to the same cached
 * value, so any component reading this query redraws with the latest "N of M"
 * while later pages are still loading.
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
    /*
     * Skip the fetch when there is no user or window date yet, so we do not
     * call "/api/users//transactions" before the URL has been read into the
     * stores.
     */
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
