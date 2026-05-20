import { create } from 'zustand';

// The shape of a transaction filter and sort. This store holds the live
// filter state, so the types it is built from are defined here too. The
// transactions feature imports them from this store rather than the reverse.
export type TransactionSign = 'all' | 'inflow' | 'outflow';
export type SortField = 'date' | 'amount' | 'merchant_name';
export type SortDirection = 'asc' | 'desc';

export interface TransactionSort {
  field: SortField;
  direction: SortDirection;
}

/**
 * UI state for the transactions table — what the user has narrowed down to,
 * what they're typing into the search box, and how the rows are ordered.
 *
 * Living in Zustand (not React Query) because nothing here comes from the
 * server: it's pure UI preference state, and many components read it.
 */
export interface FiltersState {
  categoryCodes: string[];
  sign: TransactionSign;
  search: string;
  sort: TransactionSort;
  setCategories: (categoryCodes: string[]) => void;
  setSign: (sign: TransactionSign) => void;
  setSearch: (search: string) => void;
  setSort: (sort: TransactionSort) => void;
  reset: () => void;
}

const DEFAULT_FILTERS = {
  categoryCodes: [] as string[],
  sign: 'all' as TransactionSign,
  search: '',
  sort: { field: 'date', direction: 'desc' } as TransactionSort,
};

export const useFilters = create<FiltersState>((set) => ({
  ...DEFAULT_FILTERS,
  setCategories: (categoryCodes) => set({ categoryCodes }),
  setSign: (sign) => set({ sign }),
  setSearch: (search) => set({ search }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ ...DEFAULT_FILTERS }),
}));
