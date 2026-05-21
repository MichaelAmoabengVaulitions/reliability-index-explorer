import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { fromState } from '@/data/transactionState';
import { useTransactions } from '@/data/useTransactions';
import { windowFor } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { useSelectedUser } from '@/store/selectedUser';
import { colors } from '@/theme';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

import { aggregateCashflow } from './aggregateCashflow';

const CHART_HEIGHT = 320;
// Bar top radius (px) that gives the stacked bars a slightly rounded crown.
const BAR_TOP_RADIUS = 4;

const CHART_COLORS = {
  inflow: colors.money.inflow,
  outflow: colors.money.outflow,
  net: colors.chart.ink,
  grid: colors.chart.grid,
};

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function CashflowTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  currency: string;
}) {
  if (active !== true || payload === undefined || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-lg">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 space-y-1 text-sm">
        {payload.map((entry) => (
          <p key={entry.dataKey} className="m-0 flex items-center justify-between gap-4">
            <span className="text-slate-600" style={{ color: entry.color }}>
              {entry.name}
            </span>
            <span className="font-medium text-slate-900">
              {formatMoney(entry.value, currency)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Monthly money-in, money-out and net cashflow chart for the scoring window.
 *
 * The monthly totals are worked out inside a useMemo tied to the transactions,
 * so a redraw that does not change the transactions reuses the totals the
 * chart has already drawn.
 */
export function Cashflow() {
  const userId = useSelectedUser((state) => state.userId);
  const fromDate = useSelectedUser((state) => state.from);
  const scoringWindow = windowFor(fromDate);
  const transactions = useTransactions(userId, scoringWindow.start, scoringWindow.end);

  const series = useMemo(() => {
    if (transactions.data === undefined) return [];
    const list = fromState(transactions.data.state);
    return aggregateCashflow(list, {
      from: scoringWindow.start,
      to: scoringWindow.end,
    });
  }, [transactions.data, scoringWindow.start, scoringWindow.end]);

  if (transactions.isLoading) {
    return (
      <Card title="Monthly Cashflow">
        <Skeleton height={`${CHART_HEIGHT}px`} />
      </Card>
    );
  }

  if (transactions.error !== null) {
    return (
      <Card title="Monthly Cashflow">
        <ErrorState
          title="Could not load cashflow"
          description={transactions.error.message}
          onRetry={() => void transactions.refetch()}
        />
      </Card>
    );
  }

  if (series.length === 0) {
    return (
      <Card title="Monthly Cashflow">
        <EmptyState
          icon="📊"
          title="No cashflow to show"
          description="There are no transactions in the scoring window."
        />
      </Card>
    );
  }

  // Take the currency from any transaction; the API uses one currency per user.
  const list = transactions.data === undefined ? [] : fromState(transactions.data.state);
  const currency = list[0]?.currency ?? 'EUR';

  return (
    <Card title="Monthly Cashflow">
      <div style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: colors.chart.axis, fontSize: 12 }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: colors.chart.axis, fontSize: 12 }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={false}
              tickFormatter={(value: number) => formatMoney(value, currency)}
              width={90}
            />
            <Tooltip content={<CashflowTooltip currency={currency} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="inflow" name="Inflow" stackId="a" fill={CHART_COLORS.inflow} radius={[BAR_TOP_RADIUS, BAR_TOP_RADIUS, 0, 0]} />
            <Bar dataKey="outflow" name="Outflow" stackId="a" fill={CHART_COLORS.outflow} radius={[BAR_TOP_RADIUS, BAR_TOP_RADIUS, 0, 0]} />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke={CHART_COLORS.net}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_COLORS.net }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
