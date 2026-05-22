import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TransactionEvent } from '@/api/schemas';
import { buildTransaction } from '@/test-utils/fixtures/transactions';
import { createQueryClientAndWrapper, createQueryWrapper } from '@/test-utils/queryWrapper';

import { queryKeys } from './queryKeys';
import { useTransactions, type TransactionsQueryData } from './useTransactions';

const window = { userId: 'user_1001', from: '2025-09-01', to: '2026-02-20' };

describe('useTransactions', () => {
  it('returns the transactions once every page has been loaded', async () => {
    const { result } = renderHook(
      () => useTransactions(window.userId, window.from, window.to),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.state.allIds).toHaveLength(2000);
    expect(result.current.data?.liveEvents).toEqual([]);
    expect(result.current.data?.loaded).toBe(2000);
    expect(result.current.data?.total).toBe(2000);
  });

  it('gives the total count from the very first page, so a "loaded N of M" line can show before all pages are in', async () => {
    const { result } = renderHook(
      () => useTransactions(window.userId, window.from, window.to),
      { wrapper: createQueryWrapper() },
    );

    // Wait for at least one page to arrive (loaded > 0); the total should already be the final number.
    await waitFor(() => {
      expect(result.current.data?.total).toBe(2000);
      expect(result.current.data?.loaded).toBeGreaterThan(0);
    });
  });

  it('keeps live stream events when the transactions are fetched again', async () => {
    const { queryClient, wrapper } = createQueryClientAndWrapper();
    const { result } = renderHook(
      () => useTransactions(window.userId, window.from, window.to),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    /*
     * A live event arrives and is recorded on the cache, the way the
     * transaction event stream does it.
     */
    const liveEvent: TransactionEvent = {
      type: 'TRANSACTION_ADDED',
      transaction: buildTransaction({ id: 'tx_live' }),
    };
    act(() => {
      queryClient.setQueryData<TransactionsQueryData>(
        queryKeys.transactions(window.userId, window.from, window.to),
        (previous) =>
          previous === undefined
            ? previous
            : { ...previous, liveEvents: [...previous.liveEvents, liveEvent] },
      );
    });

    await act(async () => {
      await result.current.refetch();
    });

    /*
     * The refetch reloads the pages; the live event log must survive and be
     * re-applied. We read the cache directly. It is the source of truth that
     * every component's useQuery renders from.
     */
    const refetched = queryClient.getQueryData<TransactionsQueryData>(
      queryKeys.transactions(window.userId, window.from, window.to),
    );
    expect(refetched?.liveEvents).toEqual([liveEvent]);
    expect(refetched?.state.byId['tx_live']).toBeDefined();
  });
});
