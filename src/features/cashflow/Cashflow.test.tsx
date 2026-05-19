import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSelectedUser } from '@/store/selectedUser';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Cashflow } from './Cashflow';

beforeEach(() => {
  useSelectedUser.getState().setUserId('user_1001');
  useSelectedUser.getState().setFrom('2026-02-20');
});

afterEach(() => {
  useSelectedUser.getState().setUserId('');
});

describe('Cashflow', () => {
  it('renders the chart card heading once transactions resolve', async () => {
    renderWithProviders(<Cashflow />);
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Monthly Cashflow' })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });
});
