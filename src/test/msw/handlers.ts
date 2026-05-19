import { http, HttpResponse } from 'msw';

import type { Transaction, TransactionEvent } from '@/api/schemas';

import { buildReliabilityResponse } from '../fixtures/reliability';
import { buildTransactions } from '../fixtures/transactions';

const FIXTURE_TRANSACTION_COUNT = 2000;
const CURSOR_PAGE_SIZE = 200;
const BASE_PATH = '*/api/users/:userId';

interface SseHandlerOptions {
  delayMs?: number;
}

export function reliabilityHandler() {
  return http.get(`${BASE_PATH}/reliability`, ({ request }) => {
    const url = new URL(request.url);
    if (!url.searchParams.has('from')) {
      return HttpResponse.json({ error: 'from is required' }, { status: 400 });
    }
    return HttpResponse.json(buildReliabilityResponse());
  });
}

export function transactionsHandler() {
  return http.get(`${BASE_PATH}/transactions`, ({ request, params }) => {
    const url = new URL(request.url);
    const userId = String(params.userId);
    const from = url.searchParams.get('from') ?? '2025-09-01';
    const to = url.searchParams.get('to') ?? '2026-02-20';
    const cursor = url.searchParams.get('cursor');
    const pageStr = url.searchParams.get('page');
    const limitStr = url.searchParams.get('limit');

    const all = buildTransactions(FIXTURE_TRANSACTION_COUNT, { userId, from, to });

    if (cursor !== null) {
      return cursorPagedResponse(all, cursor);
    }
    if (pageStr !== null && limitStr !== null) {
      return offsetPagedResponse(all, Number(pageStr), Number(limitStr));
    }
    return unpaginatedResponse(all);
  });
}

function cursorPagedResponse(all: Transaction[], cursor: string): Response {
  let startIndex = 0;
  if (cursor !== '') {
    const found = all.findIndex((tx) => tx.id === cursor);
    startIndex = found === -1 ? 0 : found + 1;
  }
  const slice = all.slice(startIndex, startIndex + CURSOR_PAGE_SIZE);
  const lastTx = slice[slice.length - 1];
  const hasMore = startIndex + slice.length < all.length;
  const nextCursor = hasMore && lastTx ? lastTx.id : null;
  return HttpResponse.json({
    transactions: slice,
    next_cursor: nextCursor,
    total: all.length,
  });
}

function offsetPagedResponse(all: Transaction[], page: number, limit: number): Response {
  const startIndex = (page - 1) * limit;
  const slice = all.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(all.length / limit);
  return HttpResponse.json({
    transactions: slice,
    total: all.length,
    page,
    limit,
    total_pages: totalPages,
    has_more: page < totalPages,
  });
}

function unpaginatedResponse(all: Transaction[]): Response {
  return HttpResponse.json({
    transactions: all,
    total: all.length,
    has_more: false,
  });
}

export function transactionEventsHandler(options: SseHandlerOptions = {}) {
  const delayMs = options.delayMs ?? 0;
  return http.get(`${BASE_PATH}/transaction-events`, ({ params }) => {
    const userId = String(params.userId);
    const transactions = buildTransactions(FIXTURE_TRANSACTION_COUNT, { userId });
    const events = buildEventSequence(transactions);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        for (let i = 0; i < events.length; i++) {
          if (delayMs > 0 && i > 0) {
            await sleep(delayMs);
          }
          // index in-bounds by the for-loop condition.
          const event = events[i]!;
          controller.enqueue(encoder.encode(formatSseFrame(i + 1, event)));
        }
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  });
}

function formatSseFrame(id: number, event: TransactionEvent): string {
  return `id: ${id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

// Reference IDs from the fixture so merge tests can assert "added/updated/removed by id".
function buildEventSequence(transactions: Transaction[]): TransactionEvent[] {
  const [first, second, third] = transactions.slice(0, 3);
  if (!first || !second || !third) return [];
  return [
    { type: 'TRANSACTION_ADDED', transaction: withIdSuffix(first, 'event_1') },
    { type: 'TRANSACTION_ADDED', transaction: withIdSuffix(second, 'event_2') },
    { type: 'TRANSACTION_UPDATED', transaction: { ...first, amount: first.amount + 1 } },
    { type: 'TRANSACTION_DELETED', transaction_id: third.id },
    { type: 'TRANSACTION_ADDED', transaction: withIdSuffix(second, 'event_3') },
  ];
}

function withIdSuffix(tx: Transaction, suffix: string): Transaction {
  return { ...tx, id: `${tx.id}_${suffix}` };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const handlers = [reliabilityHandler(), transactionsHandler(), transactionEventsHandler()];
