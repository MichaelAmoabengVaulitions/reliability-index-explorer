import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('shows the product name and the dashboard navigation', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByText('Reliability Index')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
