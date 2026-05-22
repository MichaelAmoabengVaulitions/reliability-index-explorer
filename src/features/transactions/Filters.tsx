import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { config } from '@/config';
import { categoryLabel } from '@/domain/categories';
import {
  useFilters,
  type SortDirection,
  type SortField,
  type TransactionSign,
} from '@/store/filters';

interface FiltersProps {
  /** Category codes present in the loaded transactions; these become the dropdown options. */
  availableCategoryCodes: readonly string[];
}

const SIGN_OPTIONS: ReadonlyArray<{ value: TransactionSign; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'inflow', label: 'Inflow' },
  { value: 'outflow', label: 'Outflow' },
];

const SORT_OPTIONS: ReadonlyArray<{
  value: `${SortField}:${SortDirection}`;
  label: string;
  field: SortField;
  direction: SortDirection;
}> = [
  { value: 'date:desc', label: 'Newest first', field: 'date', direction: 'desc' },
  { value: 'date:asc', label: 'Oldest first', field: 'date', direction: 'asc' },
  { value: 'amount:desc', label: 'Largest amount', field: 'amount', direction: 'desc' },
  { value: 'amount:asc', label: 'Smallest amount', field: 'amount', direction: 'asc' },
  { value: 'merchant_name:asc', label: 'Merchant A → Z', field: 'merchant_name', direction: 'asc' },
];

/**
 * The toolbar above the transaction list: a category picker, a money in/out
 * toggle, a search box and a sort menu. Search keystrokes wait for a short
 * pause before they reach the filter store, so the list is not re-filtered on
 * every key press.
 */
export function Filters({ availableCategoryCodes }: FiltersProps) {
  const categoryCodes = useFilters((state) => state.categoryCodes);
  const setCategories = useFilters((state) => state.setCategories);
  const sign = useFilters((state) => state.sign);
  const setSign = useFilters((state) => state.setSign);
  const storeSearch = useFilters((state) => state.search);
  const setSearch = useFilters((state) => state.setSearch);
  const sort = useFilters((state) => state.sort);
  const setSort = useFilters((state) => state.setSort);

  const [searchDraft, setSearchDraft] = useState(storeSearch);

  /*
   * The last search text this component sent to the store. When the store's
   * search value differs from this, the change came from elsewhere (the Clear
   * filters button, or a shared link being opened), and the box below should
   * follow it rather than overwrite it.
   */
  const lastSentSearch = useRef(storeSearch);

  /*
   * Send what the visitor has typed into the store only after they pause for
   * a moment, so the list is not re-filtered on every key press.
   */
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchDraft !== storeSearch) {
        lastSentSearch.current = searchDraft;
        setSearch(searchDraft);
      }
    }, config.ui.searchDebounceMs);
    return () => clearTimeout(handle);
  }, [searchDraft, storeSearch, setSearch]);

  /*
   * Follow a search value that changed outside this component, so resetting
   * the filters or opening a shared link updates the search box to match.
   */
  useEffect(() => {
    if (storeSearch !== lastSentSearch.current) {
      lastSentSearch.current = storeSearch;
      setSearchDraft(storeSearch);
    }
  }, [storeSearch]);

  function toggleCategory(code: string) {
    if (categoryCodes.includes(code)) {
      setCategories(categoryCodes.filter((existing) => existing !== code));
    } else {
      setCategories([...categoryCodes, code]);
    }
  }

  const currentSortValue = `${sort.field}:${sort.direction}` as const;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative">
        <span className="sr-only">Search merchant</span>
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search merchant…"
          className="block w-56 rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-400 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
        />
      </label>

      <div
        role="group"
        aria-label="Sign filter"
        className="inline-flex rounded-md border border-slate-300 bg-white p-0.5"
      >
        {SIGN_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSign(option.value)}
            aria-pressed={sign === option.value}
            className={`px-3 py-1 text-sm font-medium ${
              sign === option.value
                ? 'rounded bg-brand-500 text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Categories{categoryCodes.length > 0 ? ` (${categoryCodes.length})` : ''}
        </summary>
        <div className="absolute left-0 z-10 mt-1 max-h-60 w-56 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          {availableCategoryCodes.length === 0 ? (
            <p className="m-0 px-2 py-1 text-xs text-slate-500">No categories in this window.</p>
          ) : (
            availableCategoryCodes.map((code) => (
              <label
                key={code}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={categoryCodes.includes(code)}
                  onChange={() => toggleCategory(code)}
                  className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="flex-1">{categoryLabel(code)}</span>
                <span className="text-xs text-slate-400">{code}</span>
              </label>
            ))
          )}
        </div>
      </details>

      <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
        Sort:
        <select
          value={currentSortValue}
          onChange={(event) => {
            const next = SORT_OPTIONS.find((option) => option.value === event.target.value);
            if (next !== undefined) setSort({ field: next.field, direction: next.direction });
          }}
          className="rounded-md border border-slate-300 bg-white py-1.5 pl-2 pr-7 text-sm focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
