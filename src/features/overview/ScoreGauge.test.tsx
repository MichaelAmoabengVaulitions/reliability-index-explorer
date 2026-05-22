import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScoreGauge } from './ScoreGauge';

describe('ScoreGauge', () => {
  it('renders the score number prominently', () => {
    render(<ScoreGauge score={64} band="MEDIUM" />);
    expect(screen.getByText('64')).toBeInTheDocument();
  });

  it('announces the score and band through an accessible label', () => {
    render(<ScoreGauge score={64} band="MEDIUM" />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /reliability score 64 out of 100, medium band/i,
    );
  });

  it('clamps a score above 100 to a valid needle position without crashing', () => {
    render(<ScoreGauge score={250} band="HIGH" />);
    expect(screen.getByText('250')).toBeInTheDocument();
  });
});
