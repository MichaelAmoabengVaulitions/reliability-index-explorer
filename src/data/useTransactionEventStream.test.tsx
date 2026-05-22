import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTransaction } from '@/test-utils/fixtures/transactions';

import { queryKeys } from './queryKeys';
import { toState, type TransactionState } from './transactionState';
import { useTransactionEventStream } from './useTransactionEventStream';
import { type TransactionsQueryData } from './useTransactions';

interface SimpleListener {
  (event: MessageEvent): void;
}

/*
 * A stand-in for the browser's EventSource. The real one connects to the
 * network and is missing in the test environment, so we keep the instances
 * here and add a small "emit" helper so each test can send the events it
 * cares about. It records "closed" so the unmount test can check the stream
 * really does shut down, and carries a readyState (CONNECTING / OPEN / CLOSED)
 * so a test can model a dropped connection that is either being retried or
 * has failed for good.
 */
class MockEventSource {
  static last: MockEventSource | null = null;
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  url: string;
  private listeners = new Map<string, SimpleListener[]>();
  closed = false;
  readyState: number = MockEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.last = this;
  }

  addEventListener(type: string, fn: SimpleListener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(fn);
    this.listeners.set(type, existing);
  }

  emit(type: string, data: unknown): void {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    for (const fn of this.listeners.get(type) ?? []) fn(event);
  }

  close(): void {
    this.closed = true;
    this.readyState = MockEventSource.CLOSED;
  }
}

const USER_ID = 'user_1001';
const FROM = '2025-09-01';
const TO = '2026-02-20';

function buildWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function seedTransactionsCache(
  queryClient: QueryClient,
  state: TransactionState,
): void {
  queryClient.setQueryData<TransactionsQueryData>(queryKeys.transactions(USER_ID, FROM, TO), {
    state,
    loaded: state.allIds.length,
    total: state.allIds.length,
  });
}

function readTransactionsCache(queryClient: QueryClient): TransactionsQueryData | undefined {
  return queryClient.getQueryData<TransactionsQueryData>(queryKeys.transactions(USER_ID, FROM, TO));
}

beforeEach(() => {
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
  MockEventSource.last = null;
});

describe('useTransactionEventStream', () => {
  it('opens a stream to the user-specific events endpoint when a user is selected', () => {
    const queryClient = new QueryClient();
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(MockEventSource.last).not.toBeNull();
    expect(MockEventSource.last?.url).toContain(`/api/users/${USER_ID}/transaction-events`);
  });

  it('does not open a stream while the user id is empty', () => {
    const queryClient = new QueryClient();
    renderHook(() => useTransactionEventStream('', FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(MockEventSource.last).toBeNull();
  });

  it('closes the stream when the component using it unmounts', () => {
    const queryClient = new QueryClient();
    const { unmount } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    unmount();
    expect(MockEventSource.last?.closed).toBe(true);
  });

  it('applies a TRANSACTION_ADDED event to the cached transactions', async () => {
    const queryClient = new QueryClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_existing' })]));
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    const newTransaction = buildTransaction({ id: 'tx_new', merchant_name: 'New Cafe' });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: newTransaction,
      });
    });
    await waitFor(() => {
      const cached = readTransactionsCache(queryClient);
      expect(cached?.state.allIds).toContain('tx_new');
      expect(cached?.state.byId['tx_new']?.merchant_name).toBe('New Cafe');
    });
  });

  it('applies a TRANSACTION_UPDATED event by replacing the existing entry in place', async () => {
    const queryClient = new QueryClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1', amount: 10 })]));
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_UPDATED', {
        type: 'TRANSACTION_UPDATED',
        transaction: buildTransaction({ id: 'tx_1', amount: 999 }),
      });
    });
    await waitFor(() => {
      const cached = readTransactionsCache(queryClient);
      expect(cached?.state.byId['tx_1']?.amount).toBe(999);
      expect(cached?.state.allIds).toEqual(['tx_1']);
    });
  });

  it('applies a TRANSACTION_DELETED event by removing the entry from both lookups', async () => {
    const queryClient = new QueryClient();
    seedTransactionsCache(
      queryClient,
      toState([buildTransaction({ id: 'tx_1' }), buildTransaction({ id: 'tx_2' })]),
    );
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_DELETED', {
        type: 'TRANSACTION_DELETED',
        transaction_id: 'tx_1',
      });
    });
    await waitFor(() => {
      const cached = readTransactionsCache(queryClient);
      expect(cached?.state.allIds).toEqual(['tx_2']);
      expect(cached?.state.byId['tx_1']).toBeUndefined();
    });
  });

  it('skips an event that does not match the expected shape, and logs a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const queryClient = new QueryClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1' })]));
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', { type: 'NOT_A_REAL_EVENT' });
    });
    expect(warn).toHaveBeenCalled();
    const cached = readTransactionsCache(queryClient);
    expect(cached?.state.allIds).toEqual(['tx_1']);
    warn.mockRestore();
  });

  it('reports an open status once the stream connection is established', async () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(result.current.status).toBe('connecting');
    act(() => {
      MockEventSource.last?.onopen?.();
    });
    await waitFor(() => expect(result.current.status).toBe('open'));
  });

  it('reports an idle status when no user is selected', () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useTransactionEventStream('', FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(result.current.status).toBe('idle');
  });

  it('stays in the connecting state when the stream drops but the browser is retrying', async () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.onopen?.();
    });
    await waitFor(() => expect(result.current.status).toBe('open'));
    act(() => {
      const source = MockEventSource.last;
      if (source) source.readyState = MockEventSource.CONNECTING;
      source?.onerror?.();
    });
    await waitFor(() => expect(result.current.status).toBe('connecting'));
  });

  it('reports a closed status only when the connection has failed for good', async () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      const source = MockEventSource.last;
      if (source) source.readyState = MockEventSource.CLOSED;
      source?.onerror?.();
    });
    await waitFor(() => expect(result.current.status).toBe('closed'));
  });

  it('counts each live update applied, whatever kind it is', async () => {
    const queryClient = new QueryClient();
    seedTransactionsCache(
      queryClient,
      toState([buildTransaction({ id: 'tx_1' }), buildTransaction({ id: 'tx_2' })]),
    );
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(result.current.eventCount).toBe(0);
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction({ id: 'tx_3' }),
      });
      MockEventSource.last?.emit('TRANSACTION_UPDATED', {
        type: 'TRANSACTION_UPDATED',
        transaction: buildTransaction({ id: 'tx_1', amount: 50 }),
      });
      MockEventSource.last?.emit('TRANSACTION_DELETED', {
        type: 'TRANSACTION_DELETED',
        transaction_id: 'tx_2',
      });
    });
    await waitFor(() => expect(result.current.eventCount).toBe(3));
  });

  it('does not count an event that fails validation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const queryClient = new QueryClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1' })]));
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', { type: 'NOT_A_REAL_EVENT' });
    });
    expect(result.current.eventCount).toBe(0);
    warn.mockRestore();
  });

  it('starts the count again from zero when the selected user changes', async () => {
    const queryClient = new QueryClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1' })]));
    const { result, rerender } = renderHook(
      ({ userId }: { userId: string }) => useTransactionEventStream(userId, FROM, TO),
      { wrapper: buildWrapper(queryClient), initialProps: { userId: USER_ID } },
    );
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction({ id: 'tx_2' }),
      });
    });
    await waitFor(() => expect(result.current.eventCount).toBe(1));
    rerender({ userId: 'user_1002' });
    expect(result.current.eventCount).toBe(0);
  });

});
