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
 *  "connecting":  the stream is opening, or it dropped and is being retried.
 *  "open":        the stream is connected and events are arriving.
 *  "closed":      the stream failed for good and is not being retried.
 */
export type StreamStatus = 'idle' | 'connecting' | 'open' | 'closed';

/**
 * What the live updates hook reports back to the component using it.
 *
 *  status:        the current connection state (see StreamStatus above).
 *  eventCount:    how many live updates have been applied since the stream for
 *                 this user opened. It counts adds, changes and removals the
 *                 same way, so it only ever goes up while the stream is
 *                 connected, and starts again from zero when the user changes.
 *  lastAddedName: the merchant name of the most recently added transaction, so
 *                 the screen can show what just came in. It stays undefined
 *                 until the first add arrives.
 */
export interface StreamState {
  status: StreamStatus;
  eventCount: number;
  lastAddedName: string | undefined;
}

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
 * Returns the connection state and a running count of how many live updates
 * have been applied, so the component can show a "Live" badge and how much
 * has come through.
 */
export function useTransactionEventStream(
  userId: string,
  from: string,
  to: string,
): StreamState {
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

  /*
   * A running count of the live updates applied since this stream opened. It
   * counts every applied event the same way, whether it added, changed or
   * removed a transaction, so it always moves forward and never sits still
   * while updates are arriving.
   *
   * The count is stored next to the stream it belongs to (one user and one
   * window). When that stream changes, the count starts again from zero.
   * Clearing it by comparing during render is React's recommended way to
   * reset state when an input changes.
   */
  const streamKey = `${userId}|${from}|${to}`;
  const [applied, setApplied] = useState<{
    streamKey: string;
    count: number;
    lastAddedName: string | undefined;
  }>({ streamKey, count: 0, lastAddedName: undefined });
  if (applied.streamKey !== streamKey) {
    setApplied({ streamKey, count: 0, lastAddedName: undefined });
  }

  useEffect(() => {
    if (!shouldSubscribe) return;

    const source = new EventSource(`${API_BASE_URL}/api/users/${userId}/transaction-events`);
    source.onopen = () => setConnectionStatus('open');
    /*
     * EventSource raises an error for any broken connection, including the
     * ordinary case where the connection dropped and the browser is already
     * reconnecting on its own. While it retries, readyState stays at
     * CONNECTING; it only becomes CLOSED when the browser has given up for
     * good. So a dropped-but-retrying stream is shown as "connecting", not as
     * a red disconnected badge, and "closed" is kept for a real, final failure.
     */
    source.onerror = () => {
      const hasFailedForGood = source.readyState === EventSource.CLOSED;
      setConnectionStatus(hasFailedForGood ? 'closed' : 'connecting');
    };

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
      setApplied((current) => ({
        streamKey: current.streamKey,
        count: current.count + 1,
        lastAddedName:
          parsed.data.type === 'TRANSACTION_ADDED'
            ? (parsed.data.transaction?.merchant_name ?? current.lastAddedName)
            : current.lastAddedName,
      }));
    };

    for (const eventName of EVENT_TYPE_NAMES) {
      source.addEventListener(eventName, handleEvent);
    }

    return () => {
      source.close();
    };
  }, [shouldSubscribe, userId, from, to, queryClient]);

  return shouldSubscribe
    ? {
        status: connectionStatus,
        eventCount: applied.count,
        lastAddedName: applied.lastAddedName,
      }
    : { status: 'idle', eventCount: 0, lastAddedName: undefined };
}
