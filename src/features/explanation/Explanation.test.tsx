import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSelectedUser } from '@/store/selectedUser';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Explanation } from './Explanation';

beforeEach(() => {
  useSelectedUser.getState().setUserId('user_1001');
  useSelectedUser.getState().setFrom('2026-02-20');
});

afterEach(() => {
  useSelectedUser.getState().setUserId('');
});

describe('Explanation', () => {
  it('shows the medium-band summary paragraph for the fixture', async () => {
    renderWithProviders(<Explanation />);
    await waitFor(() => {
      expect(screen.getByText(/this score sits in the middle band/i)).toBeInTheDocument();
    });
  });

  it('splits the fixture drivers into helping and hurting columns', async () => {
    renderWithProviders(<Explanation />);
    await waitFor(() => {
      expect(screen.getByText(/savings behavior detected/i)).toBeInTheDocument();
    });
    // The savings driver (+13 pts) goes in the "helping" column.
    expect(screen.getByText('+13 pts')).toBeInTheDocument();
    // The negative balance driver (-10 pts) goes in the "hurting" column.
    expect(screen.getByText('-10 pts')).toBeInTheDocument();
    // The late fee driver (-1 pts) is also a risk.
    expect(screen.getByText('-1 pts')).toBeInTheDocument();
  });

  it('puts drivers without a points value in the Notes section', async () => {
    renderWithProviders(<Explanation />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
    });
    const notesHeading = screen.getByRole('heading', { name: 'Notes' });
    const notesSection = notesHeading.parentElement as HTMLElement;
    expect(within(notesSection).getByText('Income present in 5/6 months')).toBeInTheDocument();
  });
});
