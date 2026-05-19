import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type ReactNode } from 'react';

/**
 * Wraps a hook or component under test with a fresh React Query client.
 *
 * A new client per test means the cache, in-flight queries, and retry state
 * cannot leak between tests. Retries are disabled so error paths surface
 * immediately instead of after several backoffs.
 */
export function createQueryWrapper(): ({ children }: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
