import { useReliability } from '@/data/useReliability';
import { formatMonth, parseISODate, windowFor } from '@/domain/dates';
import { formatCoverageRatio } from '@/domain/scoring';
import { useSelectedUser } from '@/store/selectedUser';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

import { ScoreGauge } from './ScoreGauge';

const DRIVERS_PREVIEW_COUNT = 3;

const BAND_STYLES = {
  LOW: { chip: 'bg-red-100 text-red-800', label: 'Limited reliability' },
  MEDIUM: { chip: 'bg-amber-100 text-amber-900', label: 'Moderate reliability' },
  HIGH: { chip: 'bg-emerald-100 text-emerald-800', label: 'Strong reliability' },
} as const;

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface MetricTileProps {
  label: string;
  value: string;
  hint?: string;
}

function MetricTile({ label, value, hint }: MetricTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {hint !== undefined && <p className="m-0 mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * The Reliability Overview card — the headline view for a user.
 *
 * Shows the score gauge, the band label, the scoring window dates, six
 * metric tiles drawn from the reliability response, and the first three
 * driver strings. The "See all explanations" link jumps the page to the
 * Explanation Panel further down.
 */
export function Overview() {
  const userId = useSelectedUser((state) => state.userId);
  const from = useSelectedUser((state) => state.from);
  const reliability = useReliability(userId, from);

  if (reliability.isLoading) {
    return (
      <Card title="Reliability Overview">
        <div className="flex flex-col items-center gap-4">
          <Skeleton height="180px" width="320px" />
          <Skeleton height="24px" width="180px" />
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height="56px" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (reliability.error !== null) {
    return (
      <Card title="Reliability Overview">
        <ErrorState
          title="Could not load the reliability score"
          description={reliability.error.message}
          onRetry={() => void reliability.refetch()}
        />
      </Card>
    );
  }

  const response = reliability.data;
  if (response === undefined) {
    return (
      <Card title="Reliability Overview">
        <p className="text-sm text-slate-500">No reliability data available.</p>
      </Card>
    );
  }

  const { reliability_index: score, score_band: band, metrics, drivers, currency } = response;
  const window = windowFor(from);
  const windowLabel = `${formatMonth(parseISODate(window.start))} – ${formatMonth(parseISODate(window.end))}`;
  const bandStyle = BAND_STYLES[band];

  return (
    <Card title="Reliability Overview" ariaLabel={`Reliability Overview for ${userId}`}>
      <div className="grid gap-8 lg:grid-cols-[auto,1fr] lg:items-start">
        <div className="flex flex-col items-center gap-3">
          <ScoreGauge score={score} band={band} />
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${bandStyle.chip}`}
          >
            {band}
          </span>
          <p className="text-sm text-slate-600">{bandStyle.label}</p>
          <p className="text-xs text-slate-500">
            Scoring window: <span className="font-medium text-slate-700">{windowLabel}</span>
          </p>
          <p className="text-xs text-slate-500">
            Currency: <span className="font-medium text-slate-700">{currency}</span>
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricTile label="Income regularity" value={formatPercent(metrics.income_regularity)} />
            <MetricTile
              label="Income vs expenses"
              value={formatCoverageRatio(metrics.income_coverage_ratio)}
              hint={
                metrics.income_coverage_ratio === null
                  ? 'No essential expenses'
                  : 'Inflow / outflow'
              }
            />
            <MetricTile
              label="Essential payments"
              value={formatPercent(metrics.essential_payments_consistency)}
            />
            <MetricTile label="Good months" value={`${metrics.good_months} / 6`} />
            <MetricTile
              label="Negative balance days"
              value={`${metrics.negative_balance_days}`}
              hint="days in the window"
            />
            <MetricTile label="Late fees" value={`${metrics.late_fee_events}`} hint="events" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="m-0 text-sm font-semibold text-slate-900">Top drivers</h3>
              <a
                href="#explanation"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                See all explanations →
              </a>
            </div>
            <ul className="m-0 space-y-1 pl-5 text-sm text-slate-700">
              {drivers.slice(0, DRIVERS_PREVIEW_COUNT).map((driver) => (
                <li key={driver}>{driver}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
