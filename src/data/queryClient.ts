import { QueryClient } from '@tanstack/react-query';

import { config } from '@/config';

/**
 * Builds a React Query client set up with the values in src/config.ts.
 *
 * Each call returns a new client rather than sharing one, so a test can give
 * each run its own cache and stay independent of the others.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: config.query.staleTimeMs,
        gcTime: config.query.gcTimeMs,
        retry: config.query.retryCount,
        refetchOnWindowFocus: false,
      },
    },
  });
}
