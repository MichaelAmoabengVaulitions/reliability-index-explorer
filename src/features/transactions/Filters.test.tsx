import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { config } from '@/config';
import { useFilters } from '@/store/filters';

import { Filters } from './Filters';

beforeEach(() => {
  useFilters.getState().reset();
});

afterEach(() => {
  useFilters.getState().reset();
});

describe('Filters', () => {
  it('shows the search box and the inflow/outflow controls', () => {
    render(<Filters availableCategoryCodes={['5411']} />);

    expect(screen.getByPlaceholderText(/search merchant/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inflow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outflow' })).toBeInTheDocument();
  });

  it('sends what the analyst types into the filter store', async () => {
    const user = userEvent.setup();
    render(<Filters availableCategoryCodes={[]} />);

    await user.type(screen.getByPlaceholderText(/search merchant/i), 'coffee');

    await waitFor(() => {
      expect(useFilters.getState().search).toBe('coffee');
    });
  });

  it('clears the search box when filters are reset and does not restore the old term', async () => {
    const user = userEvent.setup();
    render(<Filters availableCategoryCodes={[]} />);
    const searchBox = screen.getByPlaceholderText(/search merchant/i);

    await user.type(searchBox, 'no-such-merchant');
    await waitFor(() => {
      expect(useFilters.getState().search).toBe('no-such-merchant');
    });

    /*
     * Stands in for the "Clear filters" button in the empty state, which
     * calls reset() on the filter store.
     */
    act(() => {
      useFilters.getState().reset();
    });

    expect(searchBox).toHaveValue('');

    /*
     * Wait past the search debounce window: the old term must not creep back
     * into the store once the pending keystrokes settle.
     */
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, config.ui.searchDebounceMs * 2));
    });

    expect(useFilters.getState().search).toBe('');
    expect(searchBox).toHaveValue('');
  });
});
