import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

import type { Transaction } from '@/api/schemas';
import { config } from '@/config';

import { Row } from './Row';

interface VirtualTableProps {
  transactions: Transaction[];
}

const TABLE_HEIGHT_PX = 480;

/**
 * Long-list table that only renders the rows currently in view, so a
 * thousand-row scroll still touches at most ~20 DOM nodes at once.
 *
 * Uses TanStack Virtual under the hood. The row height comes from
 * src/config.ts so any tuning happens in one place.
 */
export function VirtualTable({ transactions }: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowHeight = config.ui.virtualRowHeightPx;

  // TanStack Virtual's useVirtualizer returns functions the React Compiler
  // cannot memoize safely. We use it directly and call the returned helpers
  // each render, which is the library's recommended pattern.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: config.ui.virtualOverscan,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="grid grid-cols-[110px_1fr_120px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Date</span>
        <span>Merchant</span>
        <span className="text-right">Amount</span>
      </div>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: TABLE_HEIGHT_PX }}
        data-testid="virtual-table-scroll"
      >
        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const transaction = transactions[virtualRow.index];
            if (transaction === undefined) return null;
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Row transaction={transaction} height={rowHeight} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
