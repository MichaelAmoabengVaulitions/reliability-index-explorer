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
    // body not JSON; fall through to the fallback message
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
      `Response from ${path} failed validation — ${summary}`,
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

// Asks the backend for one page of transactions using page-and-limit
// pagination. The real backend returns offset-paginated responses with a
// has_more flag, so we always pass both page and limit on every call.
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

// Asks the backend for one page at a time and stitches the results into one
// flat array. The optional onProgress callback fires once after every page,
// so the UI can render a "loaded N of M" indicator while the load is still
// in flight. We stop when the server tells us there is no more data with
// has_more === false.
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
    if (!result.has_more) return all;
    page += 1;
  }
}

// Asks the discovery endpoint which user ids are available. The OpenAPI
// spec does not say what the response looks like, so we accept either of
// the two common layouts ('users' or 'userIds'). If the response has
// neither (or fails validation outright), we return a hard-coded sample
// list so the dropdown is never empty. Network errors are different: those
// still get re-thrown to the caller, because an outage is not the same
// problem as an unexpected response body.
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
