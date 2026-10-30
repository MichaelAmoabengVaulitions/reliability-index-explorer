import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('mounts every feature card for the picked user', async () => {
    renderWithProviders(<Dashboard />, SAMPLE_DASHBOARD_ROUTE);
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
});
