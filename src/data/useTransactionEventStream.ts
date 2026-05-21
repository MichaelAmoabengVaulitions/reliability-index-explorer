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
 *  "idle":        nothing to connect to yet (no user picked).
 *  "connecting":  the stream is opening and we are waiting for it to start.
 *  "open":        the stream is connected and events are arriving.
 *  "closed":      the stream failed or was shut down.
 */
export type StreamStatus = 'idle' | 'connecting' | 'open' | 'closed';

/*
 * The event names we listen for. They match the list in
 * transactionEventSchema, so a new event type means updating this list and
 * that one together.
 */
const EVENT_TYPE_NAMES: readonly TransactionEvent['type'][] = [
  'TRANSACTION_ADDED',
  'TRANSACTION_UPDATED',
  'TRANSACTION_DELETED',
];

/**
 * Opens a long-running connection that the backend uses to send transaction
 * add, update and delete events as they happen. Every event is checked
 * against the same description the rest of the app uses, then applied to the
 * stored transactions for the current user, so the screen updates without
 * asking the backend again.
 *
 * Returns the current connection state, so the component using it can show a
 * "Live" badge or similar.
 */
export function useTransactionEventStream(
  userId: string,
  from: string,
  to: string,
): StreamStatus {
  const queryClient = useQueryClient();
  /*
   * EventSource is a browser feature, and is missing in the test environment.
   * When it is not there we simply do nothing: the live badge stays idle and
   * tests keep working.
   */
  const eventSourceAvailable = typeof EventSource !== 'undefined';
  const shouldSubscribe =
    eventSourceAvailable && userId.length > 0 && from.length > 0 && to.length > 0;

  /*
   * We keep only the connecting/open/closed part of the status here. The
   * "idle" value is worked out from shouldSubscribe as the component draws,
   * so we never have to set state from inside the effect to go back to idle.
   */
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
          'Live transaction event did not match the expected shape; skipping it.',
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
