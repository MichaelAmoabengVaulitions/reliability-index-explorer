import { describe, expect, it } from 'vitest';

import { parseDriver } from './scoring';

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
