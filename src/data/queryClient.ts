import { QueryClient } from '@tanstack/react-query';

import { config } from '@/config';

/**
 * Builds a React Query client wired to the tuning values in src/config.ts.
 *
 * Returning a fresh instance per call (instead of exporting a singleton) lets
 * tests give each render its own cache, which keeps them independent.
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
