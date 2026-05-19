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
  });
}
