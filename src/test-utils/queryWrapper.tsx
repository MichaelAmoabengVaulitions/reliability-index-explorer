import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type ReactNode } from 'react';

/**
 * Wraps a hook or component under test with a fresh React Query client.
 *
 * A new client for each test means the cache, in-flight queries, and retry
 * state cannot leak from one test into the next. Retries are turned off
 * so a failed request shows up at once instead of after several slow retries.
 */
export function createQueryWrapper(): ({ children }: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
