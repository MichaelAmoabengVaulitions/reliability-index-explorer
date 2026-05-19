import type { Transaction } from '@/api/schemas';
import { formatMoney } from '@/domain/money';

interface RowProps {
  transaction: Transaction;
  height: number;
}

/**
 * One transaction line in the virtual table.
 *
 * Inflow amounts render in green with a leading "+", outflows in red with a
 * leading "−". The sign is duplicated on purpose: colour alone is not a
 * reliable signal for colour-blind visitors (CLAUDE.md rule 8).
 */
export function Row({ transaction, height }: RowProps) {
  const isInflow = transaction.amount > 0;
  const amountClass = isInflow ? 'text-money-inflow' : 'text-money-outflow';
  const signLabel = isInflow ? '+' : '−';
  const absAmount = Math.abs(transaction.amount);

  return (
    <div
      className="grid grid-cols-[110px_1fr_120px] items-center gap-4 border-b border-slate-100 px-4 text-sm hover:bg-slate-50"
      style={{ height }}
    >
      <span className="text-slate-500">{transaction.date}</span>
      <div className="min-w-0">
        <p className="m-0 truncate font-medium text-slate-900">{transaction.merchant_name}</p>
        <p className="m-0 truncate text-xs text-slate-500">{transaction.description}</p>
      </div>
      <span className={`text-right font-semibold tabular-nums ${amountClass}`}>
        {signLabel} {formatMoney(absAmount, transaction.currency)}
      </span>
    </div>
  );
}
