import { setupWorker } from 'msw/browser';

import { config } from '@/config';

import { reliabilityHandler, transactionEventsHandler, transactionsHandler } from './handlers';

/*
 * In the browser we want events to arrive at a realistic pace; tests use the
 * default of 0ms (events as fast as possible).
 */
export const worker = setupWorker(
  reliabilityHandler(),
  transactionsHandler(),
  transactionEventsHandler({ delayMs: config.stream.initialRetryMs }),
);
