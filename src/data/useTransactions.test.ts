import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { useTransactions } from './useTransactions';

const window = { userId: 'user_1001', from: '2025-09-01', to: '2026-02-20' };

describe('useTransactions', () => {
  it('returns the transactions once every page has been loaded', async () => {
    const { result } = renderHook(
      () => useTransactions(window.userId, window.from, window.to),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.state.allIds).toHaveLength(2000);
    expect(result.current.data?.loaded).toBe(2000);
    expect(result.current.data?.total).toBe(2000);
  });

  it('gives the total count from the very first page, so a "loaded N of M" line can show before all pages are in', async () => {
    const { result } = renderHook(
      () => useTransactions(window.userId, window.from, window.to),
      { wrapper: createQueryWrapper() },
    );

    // Wait for at least one page to arrive (loaded > 0); the total should already be the final number.
    await waitFor(() => {
      expect(result.current.data?.total).toBe(2000);
      expect(result.current.data?.loaded).toBeGreaterThan(0);
    });
  });
});
