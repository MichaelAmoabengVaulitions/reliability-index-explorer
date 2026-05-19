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
  income_coverage_ratio: z.number(),
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

export const offsetPaginatedSchema = z.strictObject({
  transactions: z.array(transactionSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  total_pages: z.number().int(),
  has_more: z.boolean(),
});

export const unpaginatedSchema = z.strictObject({
  transactions: z.array(transactionSchema),
  total: z.number().int(),
  has_more: z.boolean(),
});

// The OpenAPI spec calls GET / "API metadata and available endpoints" but
// does not say what fields it returns. We accept either of the two common
// names (users or userIds) and let any extra fields through — that is what
// z.looseObject means, as opposed to z.strictObject which rejects extras.
// This lets the call keep working even when the real endpoint returns
// something we did not predict. Once we have hit the real endpoint and
// know the layout for sure, swap this for z.strictObject and remove the
// fallback in fetchAvailableUserIds.
export const discoveryResponseSchema = z.looseObject({
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
