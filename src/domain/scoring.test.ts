import { describe, expect, it } from 'vitest';

import { captionForDriver, formatCoverageRatio, parseDriver } from './scoring';

describe('parseDriver', () => {
  it('treats a string with no parentheses suffix as neutral', () => {
    const result = parseDriver('Income present in 5/6 months');
    expect(result.kind).toBe('neutral');
    expect(result.points).toBeUndefined();
    expect(result.label).toBe('Income present in 5/6 months');
    expect(result.raw).toBe('Income present in 5/6 months');
  });

  it('treats parentheses without a pts suffix as neutral', () => {
    const result = parseDriver('Income covers essential expenses (1.41x)');
    expect(result.kind).toBe('neutral');
    expect(result.points).toBeUndefined();
  });

  it('parses a positive pts suffix and strips it from the label', () => {
    const result = parseDriver('Savings behavior detected (+13 pts)');
    expect(result.kind).toBe('positive');
    expect(result.points).toBe(13);
    expect(result.label).toBe('Savings behavior detected');
  });

  it('parses a negative pts suffix and strips it from the label', () => {
    const result = parseDriver('Estimated 54 negative balance day(s) (-10 pts)');
    expect(result.kind).toBe('risk');
    expect(result.points).toBe(-10);
    expect(result.label).toBe('Estimated 54 negative balance day(s)');
  });

  it('treats a zero pts suffix as neutral but still extracts the points value', () => {
    const result = parseDriver('Neutral driver (0 pts)');
    expect(result.kind).toBe('neutral');
    expect(result.points).toBe(0);
  });

  it('ignores a pts suffix that is not anchored to the end of the string', () => {
    const result = parseDriver('A (+5 pts) in the middle of the text');
    expect(result.kind).toBe('neutral');
    expect(result.points).toBeUndefined();
  });

  it('tolerates extra whitespace before the suffix', () => {
    const result = parseDriver('Spaced suffix   (+7 pts)');
    expect(result.kind).toBe('positive');
    expect(result.points).toBe(7);
    expect(result.label).toBe('Spaced suffix');
  });
});

describe('formatCoverageRatio', () => {
  it('formats a number as a ratio with two decimals and an x suffix', () => {
    expect(formatCoverageRatio(1.41)).toBe('1.41x');
  });

  it('rounds to two decimals', () => {
    expect(formatCoverageRatio(2.034)).toBe('2.03x');
  });

  it('shows a dash when the ratio is null, which means the user has no essential expenses', () => {
    expect(formatCoverageRatio(null)).toBe('—');
  });
});

describe('captionForDriver', () => {
  it('captions an income regularity driver', () => {
    expect(captionForDriver('Income present in 5/6 months')).toBe(
      'How regularly income arrived during the window.',
    );
  });

  it('captions an income coverage driver', () => {
    expect(captionForDriver('Strong income coverage: 2.03x essential expenses')).toBe(
      'Whether income was enough to cover the essential bills.',
    );
  });

  it('captions the no-essential-expenses coverage driver', () => {
    expect(captionForDriver('No essential expenses detected, coverage neutral')).toBe(
      'Whether income was enough to cover the essential bills.',
    );
  });

  it('captions an essential payments driver', () => {
    expect(captionForDriver('Essential payments detected consistently')).toBe(
      'Whether essential bills were paid on a regular schedule.',
    );
  });

  it('captions a savings driver', () => {
    expect(captionForDriver('Savings behavior detected (+13 pts)')).toBe(
      'Money regularly set aside.',
    );
  });

  it('captions a negative balance driver', () => {
    expect(captionForDriver('Estimated 54 negative balance day(s) (-10 pts)')).toBe(
      'Days the account was overdrawn.',
    );
  });

  it('captions a late fee driver', () => {
    expect(captionForDriver('1 late fee event(s) detected (-1 pts)')).toBe(
      'Charges for paying a bill late.',
    );
  });

  it('captions a cashflow months driver', () => {
    expect(captionForDriver('Good cashflow months: 4/6')).toBe(
      'Months that ended in good financial shape.',
    );
  });

  it('captions a high-risk spending driver', () => {
    expect(captionForDriver('High-risk category spending detected (-3 pts)')).toBe(
      'Spending in higher-risk categories.',
    );
  });

  it('returns undefined for a driver it cannot place, so no caption is shown', () => {
    expect(captionForDriver('Some new driver the backend invented')).toBeUndefined();
  });
});
