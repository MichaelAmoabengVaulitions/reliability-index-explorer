import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { config } from '@/config';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { server } from '../test-utils/msw/server';

import { UserPicker } from './UserPicker';

describe('UserPicker', () => {
  it('renders a dropdown listing the discovered user ids', async () => {
    renderWithProviders(<UserPicker />);
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'user_1001' })).toBeInTheDocument();
    });
  });

  it('shows a loading status while the discovery request is in flight', () => {
    renderWithProviders(<UserPicker />);
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  it('shows an error status when the discovery endpoint fails', async () => {
    server.use(
      http.get(`${config.api.baseUrl}/`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );
    renderWithProviders(<UserPicker />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load users/i);
    });
  });
});
