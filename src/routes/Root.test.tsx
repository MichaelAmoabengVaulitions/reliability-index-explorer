import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Root } from './Root';

describe('Root', () => {
  it('renders the app title in the header', () => {
    renderWithProviders(<Root />);
    expect(
      screen.getByRole('heading', { name: /reliability index explorer/i }),
    ).toBeInTheDocument();
  });

  it('shows the welcome hint when no user is selected', () => {
    renderWithProviders(<Root />);
    expect(screen.getByText(/pick a user to begin/i)).toBeInTheDocument();
  });
});
