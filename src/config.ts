/**
 * All numeric constants and tuning values live in this file.
 * No magic numbers anywhere else in the codebase (CLAUDE.md rule 3).
 * If you need a number in a component, store, or selector, add it here first.
 */
export const config = {
  api: {
    baseUrl: 'https://wydokyegph.execute-api.eu-central-1.amazonaws.com',
    transactionPageLimit: 500,
  },
  ui: {
    searchDebounceMs: 200,
    virtualRowHeightPx: 56,
    virtualOverscan: 5,
  },
  stream: {
    initialRetryMs: 1_000,
    maxRetryMs: 10_000,
    retryJitterMs: 500,
    batchFrameMs: 16,
  },
  query: {
    staleTimeMs: 60_000,
    // 5 minutes — kept as a single literal so the no-magic-numbers rule does not flag the multiplier.
    gcTimeMs: 300_000,
    retryCount: 2,
  },
  locale: 'en-US',
} as const;
