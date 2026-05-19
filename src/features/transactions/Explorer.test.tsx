import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFilters } from '@/store/filters';
import { useSelectedUser } from '@/store/selectedUser';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Explorer } from './Explorer';

beforeEach(() => {
  useSelectedUser.getState().setUserId('user_1001');
  useSelectedUser.getState().setFrom('2026-02-20');
  useFilters.getState().reset();
});

afterEach(() => {
  useSelectedUser.getState().setUserId('');
  useFilters.getState().reset();
});

describe('Explorer', () => {
  it('renders the transactions card heading once data resolves', async () => {
    renderWithProviders(<Explorer />);
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });

  it('shows the count footer with the total transactions loaded', async () => {
    renderWithProviders(<Explorer />);
    await waitFor(
      () => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    // The fixture builds 2000 transactions for the default scoring window; both
    // "visible" and "total" land on 2000 when no filters are applied.
    expect(screen.getAllByText('2000')).toHaveLength(2);
  });
});
