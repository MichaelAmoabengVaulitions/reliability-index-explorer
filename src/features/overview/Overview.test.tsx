import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSelectedUser } from '@/store/selectedUser';
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
    expect(screen.getByText(/income covers essential expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/essential payments detected consistently/i)).toBeInTheDocument();
  });
});
