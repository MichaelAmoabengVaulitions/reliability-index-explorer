import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchReliability } from '@/api/client';
import type { ReliabilityResponse } from '@/api/schemas';

import { queryKeys } from './queryKeys';

/**
 * Fetches the reliability score for a user and a window-start date.
 *
 * Errors thrown by fetchReliability (ApiError, ValidationError) flow through
 * to result.error, so components can render typed error states instead of
 * wrapping the call in try/catch.
 */
export function useReliability(
  userId: string,
  from: string,
): UseQueryResult<ReliabilityResponse, Error> {
  return useQuery<ReliabilityResponse, Error>({
    queryKey: queryKeys.reliability(userId, from),
    queryFn: () => fetchReliability(userId, from),
    // Skip the fetch when there is no user or no window date yet, so we do
    // not hit "/api/users//reliability" while the URL or store is hydrating.
    enabled: userId.length > 0 && from.length > 0,
  });
}
