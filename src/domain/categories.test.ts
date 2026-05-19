import { describe, expect, it } from 'vitest';

import { categoryLabel } from './categories';

describe('categoryLabel', () => {
  it('returns the friendly label for a known merchant category code', () => {
    expect(categoryLabel('5411')).toBe('Grocery Stores');
  });

  it('returns the friendly label for utilities (4900)', () => {
    expect(categoryLabel('4900')).toBe('Utilities');
  });

  it('returns the friendly label for cafes (5814)', () => {
    expect(categoryLabel('5814')).toBe('Eating Places');
  });

  it('returns the friendly label for electronics (5732)', () => {
    expect(categoryLabel('5732')).toBe('Electronics Stores');
  });

  it('returns the friendly label for payroll/ATM (6011)', () => {
    expect(categoryLabel('6011')).toBe('Cash & Payroll');
  });

  it('returns the friendly label for real estate rentals (6513)', () => {
    expect(categoryLabel('6513')).toBe('Real Estate Rentals');
  });

  it('returns the raw code when the code is not in the lookup table', () => {
    expect(categoryLabel('9999')).toBe('9999');
  });

  it('returns the raw code when the input has surrounding whitespace (no auto-trim)', () => {
    expect(categoryLabel(' 5411 ')).toBe(' 5411 ');
  });
});
