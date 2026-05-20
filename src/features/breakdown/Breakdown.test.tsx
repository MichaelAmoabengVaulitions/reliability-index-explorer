import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSelectedUser } from '@/store/selectedUser';
import { buildReliabilityResponse } from '@/test-utils/fixtures/reliability';
import { server } from '@/test-utils/msw/server';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Breakdown } from './Breakdown';

beforeEach(() => {
  useSelectedUser.getState().setUserId('user_1001');
  useSelectedUser.getState().setFrom('2026-02-20');
});

afterEach(() => {
  useSelectedUser.getState().setUserId('');
});

describe('Breakdown', () => {
  it('renders all four signal cards with the fixture values', async () => {
    renderWithProviders(<Breakdown />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Income Regularity' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Income Coverage Ratio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Essential Payments Consistency' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resilience Adjustments' })).toBeInTheDocument();
  });

  it('shows the income regularity as a rounded percentage', async () => {
    renderWithProviders(<Breakdown />);
    await waitFor(() => {
      expect(screen.getByText('83%')).toBeInTheDocument();
    });
  });

  it('shows the income coverage ratio with two decimals and an x suffix', async () => {
    renderWithProviders(<Breakdown />);
    await waitFor(() => {
      expect(screen.getByText('1.41x')).toBeInTheDocument();
    });
  });

  it('surfaces the savings driver inside the resilience card when present', async () => {
    renderWithProviders(<Breakdown />);
    await waitFor(() => {
      expect(screen.getByText(/Savings behavior detected/i)).toBeInTheDocument();
    });
    expect(screen.getByText('+13 pts')).toBeInTheDocument();
  });

  it('shows a dash on the coverage card when the ratio is null', async () => {
    server.use(
      http.get('*/api/users/:userId/reliability', () =>
        HttpResponse.json(buildReliabilityResponse({ metrics: { income_coverage_ratio: null } })),
      ),
    );
    renderWithProviders(<Breakdown />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Income Coverage Ratio' })).toBeInTheDocument();
    });
    const coverageCard = screen
      .getByRole('heading', { name: 'Income Coverage Ratio' })
      .closest('section');
    expect(coverageCard).toHaveTextContent('—');
  });
});
