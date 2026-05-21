import { create } from 'zustand';

/*
 * The makeup of a transaction filter and sort. This store holds the current
 * filter choices, so the types behind it are defined here too. The
 * transactions feature imports them from this store, not the other way round.
 */
export type TransactionSign = 'all' | 'inflow' | 'outflow';
export type SortField = 'date' | 'amount' | 'merchant_name';
export type SortDirection = 'asc' | 'desc';

export interface TransactionSort {
  field: SortField;
  direction: SortDirection;
}

/**
 * What the analyst has chosen in the transactions table: the filters they
 * have narrowed down to, what they are typing in the search box, and how the
 * rows are sorted.
 *
 * Kept in Zustand rather than React Query because none of it comes from the
 * server. It is the analyst's own choices, and several components read it.
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
