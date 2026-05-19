import { setupWorker } from 'msw/browser';

import { config } from '@/config';

import { reliabilityHandler, transactionEventsHandler, transactionsHandler } from './handlers';

// In the browser we want a realistic stream cadence; tests get the default 0ms.
export const worker = setupWorker(
  reliabilityHandler(),
  transactionsHandler(),
  transactionEventsHandler({ delayMs: config.stream.initialRetryMs }),
);
