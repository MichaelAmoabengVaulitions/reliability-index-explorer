import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Cashflow } from './Cashflow';

describe('Cashflow', () => {
  it('renders the chart card heading once transactions resolve', async () => {
    renderWithProviders(<Cashflow />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Monthly Cashflow' })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });
});
