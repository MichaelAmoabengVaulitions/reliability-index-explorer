import type { z } from 'zod';

import { config } from '@/config';

import {
  type OffsetPaginatedResponse,
  type ReliabilityResponse,
  type Transaction,
  discoveryResponseSchema,
  offsetPaginatedSchema,
  reliabilityResponseSchema,
} from './schemas';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? config.api.baseUrl;

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

export class ValidationError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(message: string, issues: z.core.$ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body !== null &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error;
    }
  } catch {
    // The body was not JSON, so use the fallback message instead.
  }
  return fallback;
}

export async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  init?: RequestInit,
): Promise<z.infer<S>> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const message = await readErrorMessage(response, response.statusText || 'Request failed');
    throw new ApiError(response.status, path, message);
  }
  const body: unknown = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const summary = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ValidationError(
      `Response from ${path} did not match what we expected: ${summary}`,
      parsed.error.issues,
    );
  }
  return parsed.data;
}

export function fetchReliability(userId: string, from: string): Promise<ReliabilityResponse> {
  const search = new URLSearchParams({ from });
  return request(
    `/api/users/${userId}/reliability?${search.toString()}`,
    reliabilityResponseSchema,
  );
}

interface FetchTransactionPageOptions {
  userId: string;
  from: string;
  to: string;
  page?: number;
  limit?: number;
}

const FIRST_PAGE = 1;

/*
 * Asks the backend for one page of transactions. The backend splits the list
 * into numbered pages, so we send a page number and a page size every time,
 * and it tells us with has_more whether any pages are left.
 */
export function fetchTransactionPage({
  userId,
  from,
  to,
  page = FIRST_PAGE,
  limit = config.api.transactionPageLimit,
}: FetchTransactionPageOptions): Promise<OffsetPaginatedResponse> {
  const search = new URLSearchParams({
    from,
    to,
    page: String(page),
    limit: String(limit),
  });
  return request(`/api/users/${userId}/transactions?${search.toString()}`, offsetPaginatedSchema);
}

interface FetchAllTransactionsOptions {
  userId: string;
  from: string;
  to: string;
  onProgress?: (loaded: number, total: number) => void;
}

/*
 * Asks the backend for one page at a time and joins the results into a single
 * list. The optional onProgress function is called once after every page, so
 * the screen can show a "loaded N of M" line while the load is still in flight.
 * We stop when the backend says there is no more data (has_more is false).
 */
export async function fetchAllTransactions({
  userId,
  from,
  to,
  onProgress,
}: FetchAllTransactionsOptions): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let page = FIRST_PAGE;
  while (true) {
    const result = await fetchTransactionPage({ userId, from, to, page });
    all.push(...result.transactions);
    onProgress?.(all.length, result.total);
    /*
     * Stop when there are no more pages, or when the backend reports more but
     * sends an empty one — without the empty-page check a wrong has_more flag
     * would loop forever.
     */
    if (!result.has_more || result.transactions.length === 0) return all;
    page += 1;
  }
}

/*
 * Asks the discovery endpoint which user ids are available. The API
 * specification does not say what this response looks like, so we accept any
 * of the three field names the backend has used ('available_users', 'users'
 * or 'userIds'). If the response has none of them, or does not match what we
 * expect, we fall back to a small sample list so the dropdown is never empty.
 * A failed request is different: that is passed back to the caller, because
 * the network being down is not the same problem as an unexpected response.
 */
export async function fetchAvailableUserIds(): Promise<readonly string[]> {
  try {
    const discovery = await request('/', discoveryResponseSchema);
    if (discovery.available_users !== undefined && discovery.available_users.length > 0) {
      return discovery.available_users;
    }
    if (discovery.users !== undefined && discovery.users.length > 0) return discovery.users;
    if (discovery.userIds !== undefined && discovery.userIds.length > 0) return discovery.userIds;
    return config.api.fallbackUserIds;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.warn(
        'Discovery response did not match the expected layout; falling back to the sample list.',
        error,
      );
      return config.api.fallbackUserIds;
    }
    throw error;
  }
}
