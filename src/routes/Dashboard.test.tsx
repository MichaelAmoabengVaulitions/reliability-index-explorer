import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useFilters } from '@/store/filters';
import { useSelectedUser } from '@/store/selectedUser';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Dashboard } from './Dashboard';

afterEach(() => {
  useSelectedUser.getState().setUserId('');
  useFilters.getState().reset();
});

describe('Dashboard', () => {
  it('mounts every feature card for the picked user', async () => {
    renderWithProviders(<Dashboard />, {
      path: '/users/:userId',
      initialEntries: ['/users/user_1001'],
    });
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Reliability Overview' })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    expect(screen.getByRole('heading', { name: 'Monthly Cashflow' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Score Explanation' })).toBeInTheDocument();
  });

  it('mirrors the userId from the URL into the selected-user store', () => {
    renderWithProviders(<Dashboard />, {
      path: '/users/:userId',
      initialEntries: ['/users/user_1001'],
    });
    expect(useSelectedUser.getState().userId).toBe('user_1001');
  });
});
