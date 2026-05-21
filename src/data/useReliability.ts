import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchReliability } from '@/api/client';
import type { ReliabilityResponse } from '@/api/schemas';

import { queryKeys } from './queryKeys';

/**
 * Fetches the reliability score for a user and a window-start date.
 *
 * A failed request, or a response that does not match what we expect, comes
 * back on result.error, so a component can show an error message and a retry
 * button instead of handling the call itself.
 */
export function useReliability(
  userId: string,
  from: string,
): UseQueryResult<ReliabilityResponse, Error> {
  return useQuery<ReliabilityResponse, Error>({
    queryKey: queryKeys.reliability(userId, from),
    queryFn: () => fetchReliability(userId, from),
    /*
     * Skip the fetch when there is no user or window date yet, so we do not
     * call "/api/users//reliability" before the URL has been read into the
     * stores.
     */
    enabled: userId.length > 0 && from.length > 0,
  });
}
