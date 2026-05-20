import type { Transaction } from '@/api/schemas';
import type { TransactionSign, TransactionSort } from '@/store/filters';

export interface TransactionFilters {
  categoryCodes?: string[];
  sign?: TransactionSign;
  search?: string;
  sort?: TransactionSort;
}

// Returns a new array of transactions narrowed by the filters and ordered by the sort spec.
// Cheap filters run first so the sort touches the smallest possible array. The input is
// never mutated — callers can hold the reference safely after the call returns.
export function applyTransactionFilters(
  transactions: Transaction[],
  filters: TransactionFilters = {},
): Transaction[] {
  let result = transactions;

  if (filters.sign === 'inflow') {
    result = result.filter((tx) => tx.amount > 0);
  } else if (filters.sign === 'outflow') {
    result = result.filter((tx) => tx.amount < 0);
  }

  if (filters.categoryCodes !== undefined && filters.categoryCodes.length > 0) {
    const codes = new Set(filters.categoryCodes);
    result = result.filter((tx) => codes.has(tx.merchant_category_code));
  }

  if (filters.search !== undefined && filters.search.length > 0) {
    const needle = filters.search.toLowerCase();
    result = result.filter((tx) => tx.merchant_name.toLowerCase().includes(needle));
  }

  if (filters.sort !== undefined) {
    // We copy before sorting because Array.prototype.sort is in-place and we must not
    // touch the input array (and at this point `result` may still be the input reference).
    result = result.slice().sort(compareBy(filters.sort));
  } else if (result === transactions) {
    // No filters matched and no sort: still return a fresh array so the caller cannot
    // accidentally mutate the input through the returned reference.
    result = result.slice();
  }

  return result;
}

function compareBy(sort: TransactionSort): (a: Transaction, b: Transaction) => number {
  const directionMultiplier = sort.direction === 'asc' ? 1 : -1;
  if (sort.field === 'amount') {
    return (a, b) => (a.amount - b.amount) * directionMultiplier;
  }
  if (sort.field === 'date') {
    // Date strings are YYYY-MM-DD so localeCompare gives correct chronological order.
    return (a, b) => a.date.localeCompare(b.date) * directionMultiplier;
  }
  return (a, b) => a.merchant_name.localeCompare(b.merchant_name) * directionMultiplier;
}
