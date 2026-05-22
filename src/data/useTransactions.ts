import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { fetchAllTransactions } from '@/api/client';
import type { TransactionEvent } from '@/api/schemas';

import { queryKeys } from './queryKeys';
import { applyTransactionEvents, toState, type TransactionState } from './transactionState';

/**
 * What useTransactions keeps in the React Query cache while loading and once
 * done.
 *
 * `state` holds the transactions to show: the fetched pages with every live
 * stream event applied, arranged so one can be found straight away by its id.
 * `liveEvents` is the running log of those stream events, kept so a refetch
 * (which reloads the pages) can re-apply them rather than dropping them; the
 * log grows with the length of the session. `loaded` and `total` track how
 * far the page-by-page load has got, so the screen can show a "loaded N of M"
 * line before every page has arrived.
 */
export interface TransactionsQueryData {
  state: TransactionState;
  liveEvents: TransactionEvent[];
  loaded: number;
  total: number;
}

const EMPTY_TRANSACTIONS_DATA: TransactionsQueryData = {
  state: toState([]),
  liveEvents: [],
  loaded: 0,
  total: 0,
};

/**
 * Fetches every page of transactions for a user and window, and arranges the
 * result so a transaction can be found straight away by its id.
 *
 * After each page, the progress counts are saved back to the same cached
 * value, so any component reading this query redraws with the latest "N of M"
 * while later pages are still loading. Live stream events recorded on the
 * cache are re-applied to the freshly loaded pages, so a refetch keeps them.
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
            liveEvents: previous?.liveEvents ?? EMPTY_TRANSACTIONS_DATA.liveEvents,
            loaded,
            total,
          }));
        },
      });
      /*
       * Carry over any live stream events recorded on the cache and re-apply
       * them to the freshly loaded pages, so a refetch does not drop the live
       * updates received so far.
       */
      const liveEvents =
        queryClient.getQueryData<TransactionsQueryData>(queryKey)?.liveEvents ??
        EMPTY_TRANSACTIONS_DATA.liveEvents;
      return {
        state: applyTransactionEvents(toState(transactions), liveEvents),
        liveEvents,
        loaded: transactions.length,
        total: transactions.length,
      };
    },
  });
}
