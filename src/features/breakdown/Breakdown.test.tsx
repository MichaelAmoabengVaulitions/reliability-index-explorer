import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildReliabilityResponse } from '@/test-utils/fixtures/reliability';
import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Breakdown } from './Breakdown';

describe('Breakdown', () => {
  it('renders all four signal cards with the fixture values', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Income Regularity' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Income Coverage Ratio' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Essential Payments Consistency' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resilience Adjustments' })).toBeInTheDocument();
  });

  it('shows the income regularity as a rounded percentage', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByText('83%')).toBeInTheDocument();
    });
  });

  it('shows the income coverage ratio with two decimals and an x suffix', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByText('1.41x')).toBeInTheDocument();
    });
  });

  it('shows the resilience total added up from the driver points', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    // The fixture has +13, -10 and -1.
    expect(await screen.findByText('+2 pts')).toBeInTheDocument();
    expect(screen.getByText(/-20 to \+25 pts/)).toBeInTheDocument();
  });

  it('shows zero points when no driver has any', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json(
        buildReliabilityResponse({ response: { drivers: ['Income present in 0/6 months'] } }),
      ),
    );
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByText('0 pts')).toBeInTheDocument();
  });

  it('shows a dash on the coverage card when the ratio is null', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json(buildReliabilityResponse({ metrics: { income_coverage_ratio: null } })),
    );
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Income Coverage Ratio' })).toBeInTheDocument();
    });
    const coverageCard = screen
      .getByRole('heading', { name: 'Income Coverage Ratio' })
      .closest('section');
    expect(coverageCard).toHaveTextContent('—');
  });
});
