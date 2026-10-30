import { QueryClient } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { config } from '@/config';
import { queryKeys } from '@/data/queryKeys';
import { todayAsIsoDate } from '@/domain/dates';
import { server } from '@/test-utils/msw/server';

import { dashboardLoader, rootLoader, shouldReloadDashboard } from './loaders';

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

function dashboardRequest(queryString: string) {
  return new Request(`http://localhost/users/user_1001${queryString}`);
}

describe('rootLoader', () => {
  it('starts loading the list of users', async () => {
    await rootLoader(queryClient)();

    await waitFor(() => {
      expect(queryClient.getQueryData(queryKeys.discovery)).toBeDefined();
    });
  });

  it('does not fail when the backend is down', async () => {
    server.use(
      http.get(`${config.api.baseUrl}/`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );

    await expect(rootLoader(queryClient)()).resolves.toBeNull();
  });
});

describe('dashboardLoader', () => {
  it('starts loading the score and transactions for the user and date in the URL', async () => {
    await dashboardLoader(queryClient)({
      params: { userId: 'user_1001' },
      request: dashboardRequest('?from=2026-02-20'),
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(queryKeys.reliability('user_1001', '2026-02-20')),
      ).toBeDefined();
    });
    await waitFor(() => {
      expect(
        queryClient.getQueryData(queryKeys.transactions('user_1001', '2025-09-01', '2026-02-20')),
      ).toBeDefined();
    });
  });

  it('uses the default date when the URL date is not valid', async () => {
    await dashboardLoader(queryClient)({
      params: { userId: 'user_1001' },
      request: dashboardRequest('?from=not-a-date'),
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(queryKeys.reliability('user_1001', todayAsIsoDate())),
      ).toBeDefined();
    });
  });

  it('does not wait for the data, so the page can show its skeletons', async () => {
    await dashboardLoader(queryClient)({
      params: { userId: 'user_1001' },
      request: dashboardRequest('?from=2026-02-20'),
    });

    expect(queryClient.isFetching()).toBeGreaterThan(0);
  });

  it('does not fail when the backend is down, so each card can show its own error', async () => {
    server.use(
      http.get('*/api/users/:userId/reliability', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );

    await expect(
      dashboardLoader(queryClient)({
        params: { userId: 'user_1001' },
        request: dashboardRequest('?from=2026-02-20'),
      }),
    ).resolves.toBeNull();
  });

  it('fetches nothing when the URL has no user', async () => {
    await dashboardLoader(queryClient)({ params: {}, request: dashboardRequest('') });

    expect(queryClient.isFetching()).toBe(0);
  });
});

describe('shouldReloadDashboard', () => {
  function reloadFor(currentUrl: string, nextUrl: string, nextUserId = 'user_1001') {
    return shouldReloadDashboard({
      currentParams: { userId: 'user_1001' },
      nextParams: { userId: nextUserId },
      currentUrl: new URL(`http://localhost${currentUrl}`),
      nextUrl: new URL(`http://localhost${nextUrl}`),
    });
  }

  it('skips the reload when only the filters change', () => {
    expect(reloadFor('/?from=2026-02-20', '/?from=2026-02-20&sign=inflow')).toBe(false);
  });

  it('reloads when the date changes', () => {
    expect(reloadFor('/?from=2026-02-20', '/?from=2026-01-20')).toBe(true);
  });

  it('reloads when the user changes', () => {
    expect(reloadFor('/?from=2026-02-20', '/?from=2026-02-20', 'user_1002')).toBe(true);
  });
});
