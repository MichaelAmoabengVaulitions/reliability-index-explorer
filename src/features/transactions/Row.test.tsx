import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildTransaction } from '@/test-utils/fixtures/transactions';

import { Row } from './Row';

describe('Row', () => {
  it('shows the merchant name and the formatted amount', () => {
    render(
      <Row
        transaction={buildTransaction({ merchant_name: 'Cafe Central', amount: -8.75 })}
        height={56}
      />,
    );
    expect(screen.getByText('Cafe Central')).toBeInTheDocument();
    expect(screen.getByText(/8\.75/)).toBeInTheDocument();
  });
});
