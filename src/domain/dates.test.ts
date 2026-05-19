import { describe, expect, it } from 'vitest';

import { formatMonth, monthKey, parseISODate, windowFor } from './dates';

describe('parseISODate', () => {
  it('parses a YYYY-MM-DD string as midnight UTC on that day', () => {
    const parsed = parseISODate('2026-02-20');
    expect(parsed.toISOString()).toBe('2026-02-20T00:00:00.000Z');
  });
});

describe('formatMonth', () => {
  it('renders a date as the abbreviated month and year', () => {
    expect(formatMonth(new Date('2026-02-20T00:00:00.000Z'))).toBe('Feb 2026');
  });
});

describe('monthKey', () => {
  it('returns the date as a YYYY-MM string', () => {
    expect(monthKey(new Date('2026-02-20T00:00:00.000Z'))).toBe('2026-02');
  });
});

describe('windowFor', () => {
  it('returns a six-calendar-month window ending at the from date', () => {
    expect(windowFor('2026-02-20')).toEqual({ start: '2025-09-01', end: '2026-02-20' });
  });

  it('anchors the start to the first of the month', () => {
    expect(windowFor('2026-03-15')).toEqual({ start: '2025-10-01', end: '2026-03-15' });
  });

  it('handles the year boundary correctly', () => {
    expect(windowFor('2026-01-01')).toEqual({ start: '2025-08-01', end: '2026-01-01' });
  });
});
