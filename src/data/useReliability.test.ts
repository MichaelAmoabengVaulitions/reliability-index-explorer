import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/client';
import { server } from '@/test-utils/msw/server';
import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { useReliability } from './useReliability';

describe('useReliability', () => {
  it('resolves with the parsed reliability response on success', async () => {
    const { result } = renderHook(() => useReliability('user_1001', '2026-02-20'), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.user_id).toBe('user_1001');
    expect(result.current.data?.reliability_index).toBe(64);
    expect(result.current.data?.score_band).toBe('MEDIUM');
  });

  it('surfaces an ApiError when the request fails', async () => {
    server.use(
      http.get('*/api/users/:userId/reliability', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useReliability('user_1001', '2026-02-20'), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
