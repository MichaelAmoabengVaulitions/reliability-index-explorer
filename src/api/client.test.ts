import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { config } from '@/config';

import { server } from '../test-utils/msw/server';

import {
  ApiError,
  ValidationError,
  fetchAllTransactions,
  fetchAvailableUserIds,
  fetchReliability,
  fetchTransactionPage,
} from './client';

describe('fetchReliability', () => {
  it('resolves with a parsed reliability response on success', async () => {
    const result = await fetchReliability('user_1001', '2026-02-20');
    expect(result.user_id).toBe('user_1001');
    expect(result.reliability_index).toBe(64);
    expect(result.score_band).toBe('MEDIUM');
    expect(result.metrics.income_regularity).toBeGreaterThan(0);
  });

  it('throws ApiError with status 400 when from is empty', async () => {
    expect.assertions(3);
    try {
      await fetchReliability('user_1001', '');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.status).toBe(400);
        expect(error.message.length).toBeGreaterThan(0);
      }
    }
  });

  it('throws ValidationError when the response is missing required fields', async () => {
    server.use(http.get('*/api/users/:userId/reliability', () => HttpResponse.json({})));
    expect.assertions(2);
    try {
      await fetchReliability('user_1001', '2026-02-20');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        // Any of the required fields would do; finding one in the message proves validation ran.
        expect(error.message).toMatch(/user_id|reliability_index|score_band/);
      }
    }
  });
});

const window = { userId: 'user_1001', from: '2025-09-01', to: '2026-02-20' };

describe('fetchTransactionPage', () => {
  it('returns one page of transactions with the page number, limit, total, and has_more flag', async () => {
    const page = await fetchTransactionPage(window);
    expect(Array.isArray(page.transactions)).toBe(true);
    expect(page.total).toBe(2000);
    expect(page.page).toBe(1);
    expect(page.limit).toBe(500);
    expect(typeof page.has_more).toBe('boolean');
  });

  it('returns up to 500 records on the first call and reports has_more true when more pages remain', async () => {
    const page = await fetchTransactionPage(window);
    expect(page.transactions).toHaveLength(500);
    expect(page.has_more).toBe(true);
  });

  it('walks the pages to assemble all 2000 records with no duplicates', async () => {
    const seen = new Set<string>();
    let pageNumber = 1;
    let pageCount = 0;
    while (true) {
      const result = await fetchTransactionPage({ ...window, page: pageNumber });
      for (const tx of result.transactions) {
        expect(seen.has(tx.id)).toBe(false);
        seen.add(tx.id);
      }
      pageCount += 1;
      if (!result.has_more) break;
      pageNumber += 1;
    }
    expect(seen.size).toBe(2000);
    expect(pageCount).toBe(4); // 2000 records at the default limit of 500 is four pages
  });
});

describe('fetchAllTransactions', () => {
  it('returns one flat array containing every transaction with no duplicates', async () => {
    const all = await fetchAllTransactions(window);
    expect(all).toHaveLength(2000);
    expect(new Set(all.map((tx) => tx.id)).size).toBe(2000);
  });

  it('calls onProgress after every page with the running totals', async () => {
    const calls: Array<[number, number]> = [];
    await fetchAllTransactions({
      ...window,
      onProgress: (loaded, total) => calls.push([loaded, total]),
    });
    expect(calls).toHaveLength(4);
    expect(calls[0]).toEqual([500, 2000]);
    expect(calls[3]).toEqual([2000, 2000]);
  });

  it('rejects when any page fails', async () => {
    server.use(
      http.get('*/api/users/:userId/transactions', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );
    await expect(fetchAllTransactions(window)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('fetchAvailableUserIds', () => {
  it('returns the users array when the discovery response carries that key', async () => {
    server.use(
      http.get(`${config.api.baseUrl}/`, () =>
        HttpResponse.json({ users: ['user_1001', 'user_1002'] }),
      ),
    );
    expect(await fetchAvailableUserIds()).toEqual(['user_1001', 'user_1002']);
  });

  it('also accepts a userIds array, since the spec does not pin the shape', async () => {
    server.use(
      http.get(`${config.api.baseUrl}/`, () =>
        HttpResponse.json({ userIds: ['user_2001'] }),
      ),
    );
    expect(await fetchAvailableUserIds()).toEqual(['user_2001']);
  });

  it('also accepts an available_users array, the shape the real backend actually returns', async () => {
    server.use(
      http.get(`${config.api.baseUrl}/`, () =>
        HttpResponse.json({
          available_users: ['user_1001', 'user_1002', 'user_1003'],
          name: 'Credit Builder API',
        }),
      ),
    );
    expect(await fetchAvailableUserIds()).toEqual(['user_1001', 'user_1002', 'user_1003']);
  });

  it('falls back to the sample user when none of the known keys are present, so the picker stays usable', async () => {
    server.use(
      http.get(`${config.api.baseUrl}/`, () =>
        HttpResponse.json({ endpoints: ['/api/users/:userId/reliability'] }),
      ),
    );
    expect(await fetchAvailableUserIds()).toEqual(['user_1001']);
  });

  it('throws an ApiError when the discovery endpoint itself fails, since the network being down is not the same as an unexpected response', async () => {
    server.use(
      http.get(`${config.api.baseUrl}/`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );
    await expect(fetchAvailableUserIds()).rejects.toBeInstanceOf(ApiError);
  });
});
