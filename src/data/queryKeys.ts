/**
 * Factory for React Query cache keys.
 *
 * Centralising keys here keeps every component using the same key shape, so
 * cache reads, invalidations, and prefetches all line up automatically.
 */
export const queryKeys = {
  all: ['reliability'] as const,
  reliability: (userId: string, from: string) =>
    [...queryKeys.all, 'score', userId, from] as const,
  transactions: (userId: string, from: string, to: string) =>
    [...queryKeys.all, 'transactions', userId, from, to] as const,
};
