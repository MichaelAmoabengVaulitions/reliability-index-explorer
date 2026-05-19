import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../test/msw/server';

import { ApiError, ValidationError, fetchReliability } from './client';

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
        // any of the required fields would do; one is enough to prove validation ran
        expect(error.message).toMatch(/user_id|reliability_index|score_band/);
      }
    }
  });
});
