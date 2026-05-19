import type { z } from 'zod';

import { config } from '@/config';

import { type ReliabilityResponse, reliabilityResponseSchema } from './schemas';

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
    throw new ValidationError(`Response from ${path} failed validation — ${summary}`, parsed.error.issues);
  }
  return parsed.data;
}

export function fetchReliability(userId: string, from: string): Promise<ReliabilityResponse> {
  const search = new URLSearchParams({ from });
  return request(`/api/users/${userId}/reliability?${search.toString()}`, reliabilityResponseSchema);
}
