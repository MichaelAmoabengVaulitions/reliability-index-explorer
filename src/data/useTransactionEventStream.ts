import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { API_BASE_URL } from '@/api/client';
import { transactionEventSchema, type TransactionEvent } from '@/api/schemas';

import { queryKeys } from './queryKeys';
import { applyTransactionEvent } from './transactionState';
import { type TransactionsQueryData } from './useTransactions';

/**
 * The connection state of the live updates stream.
 *
 *  - "idle"        — nothing to subscribe to yet (no user picked).
 *  - "connecting"  — we opened the stream and are waiting for it to start.
 *  - "open"        — the stream is connected and events are flowing.
 *  - "closed"      — the stream errored or was shut down.
 */
export type StreamStatus = 'idle' | 'connecting' | 'open' | 'closed';

// The event names we listen for. They mirror the enum in
// transactionEventSchema, so adding a new event type means updating both
// in lock-step.
const EVENT_TYPE_NAMES: readonly TransactionEvent['type'][] = [
  'TRANSACTION_ADDED',
  'TRANSACTION_UPDATED',
  'TRANSACTION_DELETED',
];

/**
 * Opens a long-lived HTTP stream that the backend uses to push transaction
 * add, update, and delete events as they happen. Every event is validated
 * with the same schema the rest of the app uses, then folded into the
 * cached transactions for the active user so the UI updates without a
 * refetch.
 *
 * Returns the current connection state so the consumer can render a
 * "Live" badge or similar indicator.
 */
export function useTransactionEventStream(
  userId: string,
  from: string,
  to: string,
): StreamStatus {
  const queryClient = useQueryClient();
  // EventSource is part of the browser runtime, not jsdom or server
  // rendering. When it is missing we treat the subscription as a no-op so
  // tests and SSR keep working — the live badge stays idle.
  const eventSourceAvailable = typeof EventSource !== 'undefined';
  const shouldSubscribe =
    eventSourceAvailable && userId.length > 0 && from.length > 0 && to.length > 0;

  // We hold a sub-set of the status here. The "idle" value is derived from
  // shouldSubscribe at render time, so we never have to call setState in
  // the effect body to flip back to it.
  const [connectionStatus, setConnectionStatus] = useState<
    Exclude<StreamStatus, 'idle'>
  >('connecting');

  useEffect(() => {
    if (!shouldSubscribe) return;

    const source = new EventSource(`${API_BASE_URL}/api/users/${userId}/transaction-events`);
    source.onopen = () => setConnectionStatus('open');
    source.onerror = () => setConnectionStatus('closed');

    const cacheKey = queryKeys.transactions(userId, from, to);

    const handleEvent = (event: MessageEvent): void => {
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch (parseError) {
        console.warn('Could not read a live transaction event as JSON; skipping it.', parseError);
        return;
      }
      const parsed = transactionEventSchema.safeParse(payload);
      if (!parsed.success) {
        console.warn(
          'Live transaction event did not match the expected schema; skipping it.',
          parsed.error,
        );
        return;
      }
      queryClient.setQueryData<TransactionsQueryData>(cacheKey, (previous) => {
        if (previous === undefined) return previous;
        return { ...previous, state: applyTransactionEvent(previous.state, parsed.data) };
      });
    };

    for (const eventName of EVENT_TYPE_NAMES) {
      source.addEventListener(eventName, handleEvent);
    }

    return () => {
      source.close();
    };
  }, [shouldSubscribe, userId, from, to, queryClient]);

  return shouldSubscribe ? connectionStatus : 'idle';
}
