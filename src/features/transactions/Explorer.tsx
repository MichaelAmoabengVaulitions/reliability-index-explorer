import { useMemo } from 'react';

import { fromState } from '@/data/selectors/merge';
import { applyTransactionFilters } from '@/data/selectors/transactions';
import { useTransactions } from '@/data/useTransactions';
import { windowFor } from '@/domain/dates';
import { useFilters } from '@/store/filters';
import { useSelectedUser } from '@/store/selectedUser';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

import { Filters } from './Filters';
import { VirtualTable } from './VirtualTable';

const LOADING_ROW_COUNT = 8;

/**
 * The transaction explorer feature card.
 *
 * Composes the toolbar (Filters), the virtualised list (VirtualTable), and a
 * count footer. All filtering and sorting is delegated to
 * applyTransactionFilters in src/data/selectors/transactions.ts — this
 * component only assembles the inputs and renders the output.
 */
export function Explorer() {
  const userId = useSelectedUser((state) => state.userId);
  const fromDate = useSelectedUser((state) => state.from);
  const scoringWindow = windowFor(fromDate);
  const transactions = useTransactions(userId, scoringWindow.start, scoringWindow.end);
  const filters = useFilters();

  const allTransactions = useMemo(() => {
    if (transactions.data === undefined) return [];
    return fromState(transactions.data.state);
  }, [transactions.data]);

  const visibleTransactions = useMemo(
    () => applyTransactionFilters(allTransactions, filters),
    [allTransactions, filters],
  );

  const availableCategoryCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const tx of allTransactions) codes.add(tx.merchant_category_code);
    return [...codes].sort();
  }, [allTransactions]);

  if (transactions.isLoading) {
    return (
      <Card title="Transactions">
        <div className="space-y-2">
          {Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
            <Skeleton key={index} height="44px" />
          ))}
        </div>
      </Card>
    );
  }

  if (transactions.error !== null) {
    return (
      <Card title="Transactions">
        <ErrorState
          title="Could not load transactions"
          description={transactions.error.message}
          onRetry={() => void transactions.refetch()}
        />
      </Card>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <Card title="Transactions">
        <EmptyState
          icon="📋"
          title="No transactions in this window"
          description="Try a different scoring window or a different user."
        />
      </Card>
    );
  }

  const totalCount = allTransactions.length;
  const visibleCount = visibleTransactions.length;

  return (
    <Card title="Transactions">
      <div className="mb-3">
        <Filters availableCategoryCodes={availableCategoryCodes} />
      </div>
      {visibleCount === 0 ? (
        <EmptyState
          icon="🔍"
          title="No transactions match these filters"
          description="Try widening your search or removing a filter."
          action={
            <button
              type="button"
              onClick={() => filters.reset()}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <VirtualTable transactions={visibleTransactions} />
          <p className="m-0 mt-3 text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{visibleCount}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalCount}</span> transactions
          </p>
        </>
      )}
    </Card>
  );
}
