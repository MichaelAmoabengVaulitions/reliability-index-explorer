/**
 * Every adjustable number and setting in one place, so there are no stray
 * numbers scattered through the code. If you need a number in a component, a
 * store, or a helper, add it here first.
 */
export const config = {
  api: {
    baseUrl: 'https://wydokyegph.execute-api.eu-central-1.amazonaws.com',
    transactionPageLimit: 500,
    scoringWindowMonths: 6,
    /*
     * The only user id the API specification gives as an example. The user
     * picker falls back to this list when the discovery endpoint returns
     * nothing usable, so the dropdown is never empty.
     */
    fallbackUserIds: ['user_1001'] as const,
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
    // Five minutes.
    gcTimeMs: 300_000,
    retryCount: 2,
  },
  scoring: {
    /*
     * Score band ranges from the API specification: LOW 0-49, MEDIUM 50-74,
     * HIGH 75-100. The score gauge uses these to colour its arc so the
     * coloured zones line up with the band the backend reports.
     */
    mediumBandMin: 50,
    highBandMin: 75,
  },
  locale: 'en-US',
} as const;
