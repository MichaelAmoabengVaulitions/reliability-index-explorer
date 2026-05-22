import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildTransactions } from '@/test-utils/fixtures/transactions';

import { VirtualTable } from './VirtualTable';

describe('VirtualTable', () => {
  it('renders the column headers for a list of transactions', () => {
    render(<VirtualTable transactions={buildTransactions(50)} />);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Merchant')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });
});
