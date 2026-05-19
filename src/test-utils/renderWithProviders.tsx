import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderResult, render } from '@testing-library/react';
import { type ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ROUTER_FUTURE_FLAGS } from '@/routerFutureFlags';

interface RenderOptions {
  /** The starting URL or list of URLs the in-memory router opens with. */
  initialEntries?: string[];
  /** The route path the component is reached at. Defaults to '/'. */
  path?: string;
}

/**
 * Draws a component wrapped in the same providers the real app uses:
 * a fresh React Query client and an in-memory router opened at the given URL.
 *
 * Every call builds a new React Query client so one test's cached data can
 * never leak into the next test.
 */
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const path = options.path ?? '/';
  const initialEntries = options.initialEntries ?? [path];
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries} future={ROUTER_FUTURE_FLAGS}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
