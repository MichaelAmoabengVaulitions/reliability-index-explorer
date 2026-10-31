import type { Transaction } from '@/api/schemas';
import { formatMoney } from '@/domain/money';

interface RowProps {
  transaction: Transaction;
  height: number;
}

/**
 * One transaction line in the virtual table.
 *
 * Money coming in shows in green with a leading "+", money going out in red
 * with a leading "−". The sign is shown as well as the colour on purpose:
 * colour on its own is not a reliable signal for colour-blind visitors. A zero
 * amount is neither, so it gets no sign and no colour.
 */
function amountStyle(amount: number): { sign: string; className: string } {
  if (amount > 0) return { sign: '+ ', className: 'text-money-inflow' };
  if (amount < 0) return { sign: '− ', className: 'text-money-outflow' };
  return { sign: '', className: 'text-slate-600' };
}

export function Row({ transaction, height }: RowProps) {
  const { sign, className } = amountStyle(transaction.amount);
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
      <span className={`text-right font-semibold tabular-nums ${className}`}>
        {sign}
        {formatMoney(absAmount, transaction.currency)}
      </span>
    </div>
  );
}
