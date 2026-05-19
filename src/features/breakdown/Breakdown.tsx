import type { ReliabilityResponse } from '@/api/schemas';
import { config } from '@/config';
import { useReliability } from '@/data/useReliability';
import { parseDriver } from '@/domain/scoring';
import { useSelectedUser } from '@/store/selectedUser';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

// Each signal has a cap label describing where it sits on the 100-point scale.
// The minScore / maxScore drive the position bar so the bar shows where the
// metric falls inside its own band, not on the overall 0–100 axis.
const SIGNAL_CAP_LABELS = {
  regularity: '0–25 pts',
  coverage: '0–25 pts',
  essentials: '0–25 pts',
  resilience: '-20 to +25 pts',
} as const;

const SAVINGS_DRIVER_PATTERN = /savings|saving|surplus/i;

interface SignalCardProps {
  title: string;
  /** The displayed value, already formatted for human reading. */
  value: string;
  /** Where the value sits inside its band, 0..1. Drives the bar fill. */
  position: number;
  capLabel: string;
  extraRow?: { label: string; value: string };
}

function SignalCard({ title, value, position, capLabel, extraRow }: SignalCardProps) {
  const clamped = Math.max(0, Math.min(1, position));
  const percent = `${Math.round(clamped * 100)}%`;
  return (
    <Card title={title}>
      <p className="m-0 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="m-0 mt-1 text-xs text-slate-500">{capLabel}</p>
      <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-brand-500"
          style={{ width: percent }}
          aria-hidden="true"
        />
      </div>
      {extraRow !== undefined && (
        <p className="m-0 mt-3 text-sm text-slate-600">
          <span className="text-slate-500">{extraRow.label}:</span>{' '}
          <span className="font-medium text-slate-800">{extraRow.value}</span>
        </p>
      )}
    </Card>
  );
}

function findSavingsDriver(response: ReliabilityResponse) {
  for (const raw of response.drivers) {
    const driver = parseDriver(raw);
    if (driver.points !== undefined && SAVINGS_DRIVER_PATTERN.test(driver.label)) {
      return driver;
    }
  }
  return undefined;
}

/**
 * Four-card breakdown of the score's contributing signals.
 *
 * The first three signals come straight from `metrics`. The fourth signal
 * (Resilience) bundles three metric inputs plus an optional savings row
 * sourced from the drivers strings — the API does not surface a savings
 * field directly. When the savings driver is missing the row just does
 * not render, never a guess.
 */
export function Breakdown() {
  const userId = useSelectedUser((state) => state.userId);
  const from = useSelectedUser((state) => state.from);
  const reliability = useReliability(userId, from);

  if (reliability.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} height="180px" />
        ))}
      </div>
    );
  }

  if (reliability.error !== null) {
    return (
      <ErrorState
        title="Could not load the breakdown"
        description={reliability.error.message}
        onRetry={() => void reliability.refetch()}
      />
    );
  }

  const response = reliability.data;
  if (response === undefined) {
    return <p className="text-sm text-slate-500">No breakdown data available.</p>;
  }

  const { metrics } = response;
  const savingsDriver = findSavingsDriver(response);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SignalCard
        title="Income Regularity"
        value={`${Math.round(metrics.income_regularity * 100)}%`}
        position={metrics.income_regularity}
        capLabel={SIGNAL_CAP_LABELS.regularity}
      />
      <SignalCard
        title="Income Coverage Ratio"
        value={`${metrics.income_coverage_ratio.toFixed(2)}x`}
        // 2x or higher reads as "fully covered" — cap the bar there so 1.4x feels
        // like roughly two-thirds of the way to comfortable.
        position={metrics.income_coverage_ratio / 2}
        capLabel={SIGNAL_CAP_LABELS.coverage}
      />
      <SignalCard
        title="Essential Payments Consistency"
        value={`${Math.round(metrics.essential_payments_consistency * 100)}%`}
        position={metrics.essential_payments_consistency}
        capLabel={SIGNAL_CAP_LABELS.essentials}
      />
      <SignalCard
        title="Resilience Adjustments"
        value={`${metrics.good_months} / ${config.api.scoringWindowMonths} good months`}
        position={metrics.good_months / config.api.scoringWindowMonths}
        capLabel={SIGNAL_CAP_LABELS.resilience}
        extraRow={
          savingsDriver !== undefined
            ? {
                label: savingsDriver.label,
                value: `${savingsDriver.points && savingsDriver.points >= 0 ? '+' : ''}${savingsDriver.points} pts`,
              }
            : { label: 'Late fee events', value: `${metrics.late_fee_events}` }
        }
      />
    </div>
  );
}
