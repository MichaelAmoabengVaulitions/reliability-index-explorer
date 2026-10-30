import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Root } from './Root';

describe('Root', () => {
  it('shows the "pick a user" message in the header when no user is selected', () => {
    renderWithProviders(<Root />);
    expect(screen.getByRole('heading', { name: /pick a user to begin/i })).toBeInTheDocument();
  });

  it('shows the welcome instructions in the main area when no user is selected', () => {
    renderWithProviders(<Root />);
    expect(
      screen.getByText(/pick a user from the sidebar to load their reliability dashboard/i),
    ).toBeInTheDocument();
  });

  it('shows the scoring window date from the URL', () => {
    renderWithProviders(<Root />, { initialEntries: ['/?from=2026-02-20'] });
    expect(screen.getByText(/scoring window ends 2026-02-20/i)).toBeInTheDocument();
  });
});
