import { z } from 'zod';

// `.strict()` is our deliberate choice: surface contract drift loudly in development.
// If the live API adds fields without versioning, switch to `z.object` (loose) here.
export const transactionSchema = z.strictObject({
  id: z.string(),
  account_id: z.string(),
  user_id: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.iso.date(),
  description: z.string(),
  merchant_category_code: z.string(),
  merchant_name: z.string(),
  type: z.enum(['debit', 'credit']),
  synced_at: z.iso.datetime({ offset: true }),
});

export const scoringMetricsSchema = z.strictObject({
  income_regularity: z.number(),
  // Null when the user has no essential expenses — there is no denominator
  // for an income-to-expenses ratio, so the backend reports null rather
  // than zero. The other metrics stay numeric in that case.
  income_coverage_ratio: z.number().nullable(),
  essential_payments_consistency: z.number(),
  good_months: z.number().int(),
  negative_balance_days: z.number().int(),
  late_fee_events: z.number().int(),
});

export const reliabilityResponseSchema = z.strictObject({
  user_id: z.string(),
  from: z.iso.date(),
  currency: z.string(),
  reliability_index: z.number().int().min(0).max(100),
  score_band: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  metrics: scoringMetricsSchema,
  drivers: z.array(z.string()),
});

export const cursorPaginatedSchema = z.strictObject({
  transactions: z.array(transactionSchema),
  next_cursor: z.string().nullable(),
  total: z.number().int(),
});

// The live backend returns transactions in this shape today. total_pages is
// optional because the real server does not always include it — we walk by
// has_more instead so total_pages going missing does not break the client.
export const offsetPaginatedSchema = z.strictObject({
  transactions: z.array(transactionSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  total_pages: z.number().int().optional(),
  has_more: z.boolean(),
});

export const unpaginatedSchema = z.strictObject({
  transactions: z.array(transactionSchema),
  total: z.number().int(),
  has_more: z.boolean(),
});

// The OpenAPI spec calls GET / "API metadata and available endpoints" but
// does not say what fields it returns. The real backend uses available_users
// today; we also accept the two common alternatives (users, userIds) so
// teammates testing against a different mock or a future rename are not
// stuck. Extra fields like "name" or "endpoints" are allowed through —
// that is what z.looseObject means, as opposed to z.strictObject which
// would reject them.
export const discoveryResponseSchema = z.looseObject({
  available_users: z.array(z.string()).optional(),
  users: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
});

// ADDED/UPDATED carry `transaction`; DELETED carries `transaction_id`. Both are
// optional on the schema since the API never sends both; downstream code reads
// the one that matches the event type.
export const transactionEventSchema = z.strictObject({
  type: z.enum(['TRANSACTION_ADDED', 'TRANSACTION_UPDATED', 'TRANSACTION_DELETED']),
  transaction: transactionSchema.optional(),
  transaction_id: z.string().optional(),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type ScoringMetrics = z.infer<typeof scoringMetricsSchema>;
export type ReliabilityResponse = z.infer<typeof reliabilityResponseSchema>;
export type CursorPaginatedResponse = z.infer<typeof cursorPaginatedSchema>;
export type OffsetPaginatedResponse = z.infer<typeof offsetPaginatedSchema>;
export type UnpaginatedResponse = z.infer<typeof unpaginatedSchema>;
export type TransactionEvent = z.infer<typeof transactionEventSchema>;
export type DiscoveryResponse = z.infer<typeof discoveryResponseSchema>;
