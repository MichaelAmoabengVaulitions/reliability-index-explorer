import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_FILTERS,
  paramsForNewUser,
  readFilters,
  readFrom,
  writeFilters,
} from './dashboardParams';

function paramsFrom(queryString: string): URLSearchParams {
  return new URLSearchParams(queryString);
}

describe('readFrom', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T14:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads a valid date from the URL', () => {
    expect(readFrom(paramsFrom('from=2026-02-20'))).toBe('2026-02-20');
  });

  it("uses today's date when the URL has no date", () => {
    expect(readFrom(paramsFrom(''))).toBe('2026-05-19');
  });

  it("uses today's date when the URL has text that is not a date", () => {
    expect(readFrom(paramsFrom('from=not-a-date'))).toBe('2026-05-19');
  });

  it("uses today's date when the URL has a date that does not exist", () => {
    expect(readFrom(paramsFrom('from=2026-02-31'))).toBe('2026-05-19');
  });
});

describe('readFilters', () => {
  it('returns the defaults for an empty URL', () => {
    expect(readFilters(paramsFrom(''))).toEqual(DEFAULT_FILTERS);
  });

  it('reads every filter from the URL', () => {
    const params = paramsFrom('categories=5411,4900&sign=inflow&search=Amazon&sort=amount:asc');
    expect(readFilters(params)).toEqual({
      categoryCodes: ['5411', '4900'],
      sign: 'inflow',
      search: 'Amazon',
      sort: { field: 'amount', direction: 'asc' },
    });
  });

  it('ignores empty and repeated category codes', () => {
    expect(readFilters(paramsFrom('categories=5411,,5411,')).categoryCodes).toEqual(['5411']);
    expect(readFilters(paramsFrom('categories=')).categoryCodes).toEqual([]);
  });

  it('uses the default for an unknown sign', () => {
    expect(readFilters(paramsFrom('sign=sideways')).sign).toBe('all');
  });

  it('uses the default for a sort it does not recognise', () => {
    const defaultSort = DEFAULT_FILTERS.sort;
    expect(readFilters(paramsFrom('sort=garbled')).sort).toEqual(defaultSort);
    expect(readFilters(paramsFrom('sort=height:asc')).sort).toEqual(defaultSort);
    expect(readFilters(paramsFrom('sort=amount:sideways')).sort).toEqual(defaultSort);
  });

  it('keeps the search text exactly as given', () => {
    expect(readFilters(paramsFrom('search=Caf%C3%A9%20%26%20Co')).search).toBe('Café & Co');
  });
});

describe('writeFilters', () => {
  it('writes every filter that differs from the default', () => {
    const params = writeFilters(paramsFrom(''), {
      categoryCodes: ['5411', '4900'],
      sign: 'outflow',
      search: 'Amazon',
      sort: { field: 'amount', direction: 'asc' },
    });
    expect(params.get('categories')).toBe('5411,4900');
    expect(params.get('sign')).toBe('outflow');
    expect(params.get('search')).toBe('Amazon');
    expect(params.get('sort')).toBe('amount:asc');
  });

  it('leaves defaults out so a plain view has a clean URL', () => {
    expect(writeFilters(paramsFrom(''), DEFAULT_FILTERS).toString()).toBe('');
  });

  it('removes filters that go back to the default', () => {
    const params = writeFilters(paramsFrom('sign=inflow&search=Amazon'), DEFAULT_FILTERS);
    expect(params.toString()).toBe('');
  });

  it('keeps the date', () => {
    const params = writeFilters(paramsFrom('from=2026-02-20'), {
      ...DEFAULT_FILTERS,
      sign: 'inflow',
    });
    expect(params.get('from')).toBe('2026-02-20');
  });

  it('gives back what readFilters reads', () => {
    const filters = {
      categoryCodes: ['5411'],
      sign: 'inflow' as const,
      search: 'Café & Co',
      sort: { field: 'merchant_name' as const, direction: 'desc' as const },
    };
    expect(readFilters(writeFilters(paramsFrom(''), filters))).toEqual(filters);
  });
});

describe('paramsForNewUser', () => {
  it('keeps the date and drops the filters', () => {
    const params = paramsForNewUser(paramsFrom('from=2026-02-20&sign=inflow&search=Amazon'));
    expect(params.toString()).toBe('from=2026-02-20');
  });

  it('is empty when the URL has no date', () => {
    expect(paramsForNewUser(paramsFrom('sign=inflow')).toString()).toBe('');
  });
});
