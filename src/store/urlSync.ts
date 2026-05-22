import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { config } from '@/config';

import {
  useFilters,
  type SortDirection,
  type SortField,
  type TransactionSign,
  type TransactionSort,
} from './filters';
import { useSelectedUser } from './selectedUser';

/**
 * The query-string keys we read from and write back to the URL (the part
 * after the ? in the address bar). Listed here in one place so renaming a
 * key updates both the reading and the writing code at once.
 *
 * The selected user id is deliberately not in this list. It lives in the
 * URL path as /users/:userId so it stays part of the address itself, rather
 * than being treated as just another filter.
 */
const URL_PARAMS = {
  from: 'from',
  categories: 'categories',
  sign: 'sign',
  search: 'search',
  sort: 'sort',
} as const;

const VALID_SIGNS: readonly TransactionSign[] = ['all', 'inflow', 'outflow'];
const VALID_SORT_FIELDS: readonly SortField[] = ['date', 'amount', 'merchant_name'];
const VALID_SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value);
}

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
  const from = params.get(URL_PARAMS.from);
  if (from !== null && isIsoDate(from)) useSelectedUser.getState().setFrom(from);

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
  const { from } = useSelectedUser.getState();
  const { categoryCodes, sign, search, sort } = useFilters.getState();
  const params = new URLSearchParams();
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
 * Keeps the URL's query string in step with the filter and selected-user
 * stores.
 *
 * On first run, we read the URL once and copy its values into the stores.
 * After that, whenever a store changes we wait a short moment (so a burst
 * of keystrokes counts as one change) and then rewrite the URL. We rewrite
 * the current address in place rather than adding a new one, so each
 * keystroke does not add a step to the browser's back button.
 */
export function useUrlSync(): void {
  const [initialParams, setSearchParams] = useSearchParams();
  /*
   * Save the URL values from the first render. The setup below reads that
   * saved snapshot once, instead of re-running every time the URL changes.
   */
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
