import type { ReliabilityResponse } from '@/api/schemas';
import { config } from '@/config';
import { useReliability } from '@/data/useReliability';
import { formatCoverageRatio, parseDriver } from '@/domain/scoring';
import { useSelectedUser } from '@/store/selectedUser';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

/*
 * Each signal shows a "cap label" with the points range it can score. The
 * position bar fills to show where the signal sits inside its own range, not
 * on the overall 0 to 100 scale.
 */
const SIGNAL_CAP_LABELS = {
  regularity: '0–25 pts',
  coverage: '0–25 pts',
  essentials: '0–25 pts',
  resilience: '-20 to +25 pts',
} as const;

/*
 * A coverage ratio of 2x or higher reads as "fully covered", so the position
 * bar treats 2x as a full bar.
 */
const COVERAGE_BAR_FULL_AT = 2;

const SAVINGS_DRIVER_PATTERN = /savings|saving|surplus/i;

interface SignalCardProps {
  title: string;
  /** The displayed value, already formatted for human reading. */
  value: string;
  /** Where the value sits inside its band, from 0 to 1. Sets how full the bar is. */
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
 * A four-card breakdown of the signals that make up the score.
 *
 * The first three signals come straight from the metrics. The fourth
 * (Resilience) is built from three of the metric numbers, plus an optional
 * savings line read from the driver strings, because the API has no separate
 * savings field. When there is no savings driver, that line is simply left
 * out rather than guessed.
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
        value={formatCoverageRatio(metrics.income_coverage_ratio)}
        /*
         * 2x or higher reads as "fully covered", so the bar is capped there;
         * 1.4x then fills about two-thirds. A null ratio (the user has no
         * essential expenses) leaves the bar empty.
         */
        position={
          metrics.income_coverage_ratio === null
            ? 0
            : metrics.income_coverage_ratio / COVERAGE_BAR_FULL_AT
        }
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
