import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { config } from '@/config';

import { createQueryClient } from './queryClient';

describe('createQueryClient', () => {
  it('returns a QueryClient', () => {
    expect(createQueryClient()).toBeInstanceOf(QueryClient);
  });

  it('pulls every tunable value from the central config so we do not duplicate constants', () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(config.query.staleTimeMs);
    expect(defaults?.gcTime).toBe(config.query.gcTimeMs);
    expect(defaults?.retry).toBe(config.query.retryCount);
  });

  it('disables refetch-on-focus so background tab switches do not trigger surprise network calls', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it('returns a fresh instance per call so tests can isolate cache state', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
