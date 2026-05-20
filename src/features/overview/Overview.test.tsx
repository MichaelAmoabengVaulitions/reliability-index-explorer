import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSelectedUser } from '@/store/selectedUser';
import { buildReliabilityResponse } from '@/test-utils/fixtures/reliability';
import { server } from '@/test-utils/msw/server';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Overview } from './Overview';

beforeEach(() => {
  useSelectedUser.getState().setUserId('user_1001');
  useSelectedUser.getState().setFrom('2026-02-20');
});

afterEach(() => {
  useSelectedUser.getState().setUserId('');
});

describe('Overview', () => {
  it('shows the score number and the band once the reliability query resolves', async () => {
    renderWithProviders(<Overview />);
    await waitFor(() => {
      expect(screen.getByText('64')).toBeInTheDocument();
    });
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('renders the scoring window dates', async () => {
    renderWithProviders(<Overview />);
    await waitFor(() => {
      expect(screen.getByText(/Sep 2025 – Feb 2026/)).toBeInTheDocument();
    });
  });

  it('shows three driver strings as the preview list', async () => {
    renderWithProviders(<Overview />);
    await waitFor(() => {
      expect(screen.getByText('Income present in 5/6 months')).toBeInTheDocument();
    });
    // Match the full driver strings so the assertion does not collide with the
    // static tile descriptions (which also mention "covers essential expenses").
    expect(screen.getByText('Income covers essential expenses (1.41x)')).toBeInTheDocument();
    expect(screen.getByText('Essential payments detected consistently')).toBeInTheDocument();
  });

  it('shows a dash for the income vs expenses tile when the coverage ratio is null', async () => {
    server.use(
      http.get('*/api/users/:userId/reliability', () =>
        HttpResponse.json(buildReliabilityResponse({ metrics: { income_coverage_ratio: null } })),
      ),
    );
    renderWithProviders(<Overview />);
    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });
    // The static description still tells the analyst what the tile measures.
    expect(screen.getByText('How far income covers essential expenses.')).toBeInTheDocument();
    // The score still renders — one null metric does not break the card.
    expect(screen.getByText('64')).toBeInTheDocument();
  });
});
