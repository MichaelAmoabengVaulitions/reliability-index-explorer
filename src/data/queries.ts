import { queryOptions } from '@tanstack/react-query';

import { fetchAllTransactions, fetchAvailableUserIds, fetchReliability } from '@/api/client';
import type { TransactionEvent } from '@/api/schemas';

import { queryKeys } from './queryKeys';
import { applyTransactionEvents, toState, type TransactionState } from './transactionState';

/**
 * What we keep in the cache for a user's transactions. `state` holds the
 * fetched pages with every live event applied. `liveEvents` is the log of
 * those events, so a refetch can apply them again rather than dropping them.
 */
export interface TransactionsQueryData {
  state: TransactionState;
  liveEvents: TransactionEvent[];
}

/*
 * Each query is defined once here, so the route loaders and the components
 * share the same key and fetch function.
 */
export const discoveryQuery = queryOptions({
  queryKey: queryKeys.discovery,
  queryFn: fetchAvailableUserIds,
});

export function reliabilityQuery(userId: string, from: string) {
  return queryOptions({
    queryKey: queryKeys.reliability(userId, from),
    queryFn: () => fetchReliability(userId, from),
  });
}

export function transactionsQuery(userId: string, from: string, to: string) {
  const queryKey = queryKeys.transactions(userId, from, to);
  return queryOptions({
    queryKey,
    queryFn: async ({ client }): Promise<TransactionsQueryData> => {
      const transactions = await fetchAllTransactions({ userId, from, to });
      const liveEvents = client.getQueryData<TransactionsQueryData>(queryKey)?.liveEvents ?? [];
      return { state: applyTransactionEvents(toState(transactions), liveEvents), liveEvents };
    },
  });
}
