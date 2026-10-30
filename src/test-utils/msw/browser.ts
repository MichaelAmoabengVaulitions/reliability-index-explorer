import { setupWorker } from 'msw/browser';

import { reliabilityHandler, transactionEventsHandler, transactionsHandler } from './handlers';

/*
 * In the browser we want events to arrive at a realistic pace; tests use the
 * default of 0ms (events as fast as possible).
 */
const BROWSER_EVENT_DELAY_MS = 1_000;

export const worker = setupWorker(
  reliabilityHandler(),
  transactionsHandler(),
  transactionEventsHandler({ delayMs: BROWSER_EVENT_DELAY_MS }),
);
