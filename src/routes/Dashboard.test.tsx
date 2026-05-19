import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useSelectedUser } from '@/store/selectedUser';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Dashboard } from './Dashboard';

afterEach(() => {
  useSelectedUser.getState().setUserId('');
});

describe('Dashboard', () => {
  it('renders one placeholder card per planned feature', () => {
    renderWithProviders(<Dashboard />, {
      path: '/users/:userId',
      initialEntries: ['/users/user_1001'],
    });
    expect(screen.getByRole('heading', { name: 'Reliability Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Score Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Score Drivers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Monthly Cashflow' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
  });

  it('mirrors the userId from the URL into the selected-user store', () => {
    renderWithProviders(<Dashboard />, {
      path: '/users/:userId',
      initialEntries: ['/users/user_1001'],
    });
    expect(useSelectedUser.getState().userId).toBe('user_1001');
  });
});
