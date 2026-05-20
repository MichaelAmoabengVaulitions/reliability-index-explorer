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

// Test double for the browser's EventSource. The real one connects to the
// network and is not present in jsdom, so we capture instances here and
// expose a tiny "emit" helper so each test can drive the events it cares
// about. Tracks "closed" so the unmount test can prove the stream really
// does shut down.
class MockEventSource {
  static last: MockEventSource | null = null;
  url: string;
  private listeners = new Map<string, SimpleListener[]>();
  closed = false;
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

  it('closes the stream when the consumer unmounts', () => {
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

  it('skips events whose payload does not match the schema, logging a warning', async () => {
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
    expect(result.current).toBe('connecting');
    act(() => {
      MockEventSource.last?.onopen?.();
    });
    await waitFor(() => expect(result.current).toBe('open'));
  });

  it('reports an idle status when no user is selected', () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useTransactionEventStream('', FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(result.current).toBe('idle');
  });
});
