import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { todayAsIsoDate } from '@/domain/dates';
import { ROUTER_FUTURE_FLAGS } from '@/routerFutureFlags';

import { useFilters } from './filters';
import { useSelectedUser } from './selectedUser';
import { useUrlSync } from './urlSync';

function TestHarness() {
  useUrlSync();
  const [params] = useSearchParams();
  return <div data-testid="params">{params.toString()}</div>;
}

function renderWithRouter(initialUrl: string) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]} future={ROUTER_FUTURE_FLAGS}>
      <TestHarness />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  useFilters.getState().reset();
  useSelectedUser.getState().setUserId('');
  useSelectedUser.getState().setFrom(todayAsIsoDate());
});

describe('useUrlSync: reading the URL into the stores on first load', () => {
  it('reads the from date from the URL and pushes it into the selected-user store', () => {
    renderWithRouter('/?from=2026-02-20');
    expect(useSelectedUser.getState().from).toBe('2026-02-20');
  });

  it('splits the categories param on commas and pushes the array into filters', () => {
    renderWithRouter('/?categories=5411,4900');
    expect(useFilters.getState().categoryCodes).toEqual(['5411', '4900']);
  });

  it('reads a valid sign value, and ignores an unknown one rather than putting bad data in the store', () => {
    renderWithRouter('/?sign=inflow');
    expect(useFilters.getState().sign).toBe('inflow');

    useFilters.getState().reset();
    renderWithRouter('/?sign=sideways');
    expect(useFilters.getState().sign).toBe('all');
  });

  it('reads the search string exactly as given', () => {
    renderWithRouter('/?search=Amazon');
    expect(useFilters.getState().search).toBe('Amazon');
  });

  it('parses sort in field:direction form and ignores malformed values', () => {
    renderWithRouter('/?sort=amount:asc');
    expect(useFilters.getState().sort).toEqual({ field: 'amount', direction: 'asc' });

    useFilters.getState().reset();
    renderWithRouter('/?sort=garbled');
    expect(useFilters.getState().sort).toEqual({ field: 'date', direction: 'desc' });
  });
});

describe('useUrlSync: writing the URL back when a store changes', () => {
  it('does not update the URL until the debounce delay has passed', async () => {
    renderWithRouter('/');

    act(() => {
      useFilters.getState().setSearch('Amazon');
    });
    expect(screen.getByTestId('params').textContent).not.toContain('search=Amazon');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(config.ui.searchDebounceMs + 1);
    });
    expect(screen.getByTestId('params').textContent).toContain('search=Amazon');
  });

  it('omits defaults from the URL so a fresh URL has no clutter', async () => {
    renderWithRouter('/');

    act(() => {
      useFilters.getState().setSign('all');
      useFilters.getState().setSort({ field: 'date', direction: 'desc' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(config.ui.searchDebounceMs + 1);
    });

    expect(screen.getByTestId('params').textContent).not.toContain('sign=');
    expect(screen.getByTestId('params').textContent).not.toContain('sort=');
  });

  it('combines several rapid changes into one URL write, so each keystroke does not add a back-button step', async () => {
    renderWithRouter('/');

    act(() => {
      useFilters.getState().setSearch('A');
      useFilters.getState().setSearch('Am');
      useFilters.getState().setSearch('Amaz');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(config.ui.searchDebounceMs + 1);
    });

    expect(screen.getByTestId('params').textContent).toContain('search=Amaz');
    expect(screen.getByTestId('params').textContent).not.toContain('search=A&');
  });
});
