import { describe, expect, it } from 'vitest';

import { reliabilityResponseSchema, transactionEventSchema, transactionSchema } from './schemas';

const validTransaction = {
  id: 'tx_0001',
  account_id: 'acc_abc',
  user_id: 'user_1001',
  amount: -25.5,
  currency: 'EUR',
  date: '2026-02-20',
  description: 'Coffee purchase',
  merchant_category_code: '5814',
  merchant_name: 'Starbucks',
  type: 'debit',
  synced_at: '2026-02-20T08:15:30Z',
};

const validReliabilityResponse = {
  user_id: 'user_1001',
  from: '2026-02-20',
  currency: 'EUR',
  reliability_index: 64,
  score_band: 'MEDIUM',
  metrics: {
    income_regularity: 0.83,
    income_coverage_ratio: 1.41,
    essential_payments_consistency: 0.89,
    good_months: 4,
    negative_balance_days: 54,
    late_fee_events: 1,
  },
  drivers: ['Income present in 5/6 months', 'Income covers essential expenses (1.41x)'],
};

describe('transactionSchema', () => {
  it('parses a valid transaction', () => {
    expect(transactionSchema.safeParse(validTransaction).success).toBe(true);
  });

  it('rejects a transaction with an extra unknown field (strict mode)', () => {
    const withExtra = { ...validTransaction, unknownField: 'x' };
    expect(transactionSchema.safeParse(withExtra).success).toBe(false);
  });

  it('rejects a transaction whose date is not YYYY-MM-DD', () => {
    const badDate = { ...validTransaction, date: '2026/02/20' };
    expect(transactionSchema.safeParse(badDate).success).toBe(false);
  });

  it('rejects a transaction whose type is outside the debit/credit enum', () => {
    const badType = { ...validTransaction, type: 'transfer' };
    expect(transactionSchema.safeParse(badType).success).toBe(false);
  });
});

describe('reliabilityResponseSchema', () => {
  it('rejects a reliability_index above 100', () => {
    const tooHigh = { ...validReliabilityResponse, reliability_index: 101 };
    expect(reliabilityResponseSchema.safeParse(tooHigh).success).toBe(false);
  });

  it('rejects a score_band outside LOW/MEDIUM/HIGH', () => {
    const badBand = { ...validReliabilityResponse, score_band: 'VERY_HIGH' };
    expect(reliabilityResponseSchema.safeParse(badBand).success).toBe(false);
  });

  it('accepts a null income_coverage_ratio — the backend sends null when a user has no essential expenses', () => {
    const noEssentials = {
      ...validReliabilityResponse,
      metrics: { ...validReliabilityResponse.metrics, income_coverage_ratio: null },
    };
    expect(reliabilityResponseSchema.safeParse(noEssentials).success).toBe(true);
  });
});

describe('transactionEventSchema', () => {
  it('accepts a TRANSACTION_ADDED event with a valid transaction', () => {
    const event = { type: 'TRANSACTION_ADDED', transaction: validTransaction };
    expect(transactionEventSchema.safeParse(event).success).toBe(true);
  });

  it('accepts a TRANSACTION_DELETED event with only a transaction_id', () => {
    const event = { type: 'TRANSACTION_DELETED', transaction_id: 'tx_0001' };
    expect(transactionEventSchema.safeParse(event).success).toBe(true);
  });
});
