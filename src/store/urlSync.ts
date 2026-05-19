import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { config } from '@/config';
import type {
  SortDirection,
  SortField,
  TransactionSign,
  TransactionSort,
} from '@/data/selectors/transactions';

import { useFilters } from './filters';
import { useSelectedUser } from './selectedUser';

/**
 * Names of the URL search params we read and write. Centralised so renaming
 * one updates both the hydration and the writeback code paths.
 */
const URL_PARAMS = {
  userId: 'userId',
  from: 'from',
  categories: 'categories',
  sign: 'sign',
  search: 'search',
  sort: 'sort',
} as const;

const VALID_SIGNS: readonly TransactionSign[] = ['all', 'inflow', 'outflow'];
const VALID_SORT_FIELDS: readonly SortField[] = ['date', 'amount', 'merchant_name'];
const VALID_SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];

function isSign(value: string): value is TransactionSign {
  return (VALID_SIGNS as readonly string[]).includes(value);
}

function parseSort(raw: string): TransactionSort | null {
  const [field, direction] = raw.split(':');
  if (field === undefined || direction === undefined) return null;
  if (!(VALID_SORT_FIELDS as readonly string[]).includes(field)) return null;
  if (!(VALID_SORT_DIRECTIONS as readonly string[]).includes(direction)) return null;
  return { field: field as SortField, direction: direction as SortDirection };
}

function hydrateStoresFromParams(params: URLSearchParams): void {
  const userId = params.get(URL_PARAMS.userId);
  if (userId !== null) useSelectedUser.getState().setUserId(userId);

  const from = params.get(URL_PARAMS.from);
  if (from !== null) useSelectedUser.getState().setFrom(from);

  const categories = params.get(URL_PARAMS.categories);
  if (categories !== null && categories.length > 0) {
    useFilters.getState().setCategories(categories.split(','));
  }

  const sign = params.get(URL_PARAMS.sign);
  if (sign !== null && isSign(sign)) useFilters.getState().setSign(sign);

  const search = params.get(URL_PARAMS.search);
  if (search !== null) useFilters.getState().setSearch(search);

  const sort = params.get(URL_PARAMS.sort);
  if (sort !== null) {
    const parsed = parseSort(sort);
    if (parsed !== null) useFilters.getState().setSort(parsed);
  }
}

function serializeStoresToParams(): URLSearchParams {
  const { userId, from } = useSelectedUser.getState();
  const { categoryCodes, sign, search, sort } = useFilters.getState();
  const params = new URLSearchParams();
  if (userId.length > 0) params.set(URL_PARAMS.userId, userId);
  if (from.length > 0) params.set(URL_PARAMS.from, from);
  if (categoryCodes.length > 0) params.set(URL_PARAMS.categories, categoryCodes.join(','));
  if (sign !== 'all') params.set(URL_PARAMS.sign, sign);
  if (search.length > 0) params.set(URL_PARAMS.search, search);
  if (sort.field !== 'date' || sort.direction !== 'desc') {
    params.set(URL_PARAMS.sort, `${sort.field}:${sort.direction}`);
  }
  return params;
}

/**
 * Keeps the URL search params in sync with the filter and selected-user stores.
 *
 * On mount, reads the URL and hydrates the stores. From then on, any store
 * change triggers a debounced replaceState back into the URL — debounced so
 * each keystroke in the search box doesn't push a new history entry.
 */
export function useUrlSync(): void {
  const [initialParams, setSearchParams] = useSearchParams();
  // Capture the params from the first render so the hydration effect can use them
  // without retriggering on every subsequent URL change.
  const initialParamsRef = useRef(initialParams);

  useEffect(() => {
    hydrateStoresFromParams(initialParamsRef.current);

    let pendingWrite: ReturnType<typeof setTimeout> | null = null;
    function scheduleUrlWrite() {
      if (pendingWrite !== null) clearTimeout(pendingWrite);
      pendingWrite = setTimeout(() => {
        setSearchParams(serializeStoresToParams(), { replace: true });
      }, config.ui.searchDebounceMs);
    }

    const unsubscribeFilters = useFilters.subscribe(scheduleUrlWrite);
    const unsubscribeSelectedUser = useSelectedUser.subscribe(scheduleUrlWrite);

    return () => {
      if (pendingWrite !== null) clearTimeout(pendingWrite);
      unsubscribeFilters();
      unsubscribeSelectedUser();
    };
  }, [setSearchParams]);
}
