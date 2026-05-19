import { afterEach, describe, expect, it } from 'vitest';

import { useFilters } from './filters';

afterEach(() => {
  useFilters.getState().reset();
});

describe('useFilters', () => {
  it('starts with an empty selection and date-descending sort, so the table shows the newest activity first', () => {
    const state = useFilters.getState();
    expect(state.categoryCodes).toEqual([]);
    expect(state.sign).toBe('all');
    expect(state.search).toBe('');
    expect(state.sort).toEqual({ field: 'date', direction: 'desc' });
  });

  it('replaces the category selection when setCategories is called', () => {
    useFilters.getState().setCategories(['5411', '4900']);
    expect(useFilters.getState().categoryCodes).toEqual(['5411', '4900']);
  });

  it('flips between sign values when setSign is called', () => {
    useFilters.getState().setSign('inflow');
    expect(useFilters.getState().sign).toBe('inflow');
    useFilters.getState().setSign('outflow');
    expect(useFilters.getState().sign).toBe('outflow');
  });

  it('records the latest search string verbatim, preserving casing for the caller to lowercase if it wants', () => {
    useFilters.getState().setSearch('Amazon');
    expect(useFilters.getState().search).toBe('Amazon');
  });

  it('updates the sort spec when setSort is called', () => {
    useFilters.getState().setSort({ field: 'amount', direction: 'asc' });
    expect(useFilters.getState().sort).toEqual({ field: 'amount', direction: 'asc' });
  });

  it('restores every field to its default when reset is called', () => {
    const { setCategories, setSign, setSearch, setSort, reset } = useFilters.getState();
    setCategories(['5411']);
    setSign('outflow');
    setSearch('coffee');
    setSort({ field: 'merchant_name', direction: 'asc' });

    reset();

    const state = useFilters.getState();
    expect(state.categoryCodes).toEqual([]);
    expect(state.sign).toBe('all');
    expect(state.search).toBe('');
    expect(state.sort).toEqual({ field: 'date', direction: 'desc' });
  });
});
