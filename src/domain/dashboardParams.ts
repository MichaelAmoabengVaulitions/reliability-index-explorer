import { isIsoDate, todayAsIsoDate } from './dates';

export type TransactionSign = 'all' | 'inflow' | 'outflow';
export type SortField = 'date' | 'amount' | 'merchant_name';
export type SortDirection = 'asc' | 'desc';

export interface TransactionSort {
  field: SortField;
  direction: SortDirection;
}

export interface TransactionFilters {
  categoryCodes: string[];
  sign: TransactionSign;
  search: string;
  sort: TransactionSort;
}

export const DEFAULT_FILTERS: TransactionFilters = {
  categoryCodes: [],
  sign: 'all',
  search: '',
  sort: { field: 'date', direction: 'desc' },
};

const SIGNS: readonly string[] = ['all', 'inflow', 'outflow'];
const SORT_FIELDS: readonly string[] = ['date', 'amount', 'merchant_name'];
const SORT_DIRECTIONS: readonly string[] = ['asc', 'desc'];

function isSign(value: string): value is TransactionSign {
  return SIGNS.includes(value);
}

function isSortField(value: string): value is SortField {
  return SORT_FIELDS.includes(value);
}

function isSortDirection(value: string): value is SortDirection {
  return SORT_DIRECTIONS.includes(value);
}

function readSort(value: string): TransactionSort {
  const [field = '', direction = ''] = value.split(':');
  if (isSortField(field) && isSortDirection(direction)) return { field, direction };
  return DEFAULT_FILTERS.sort;
}

function formatSort(sort: TransactionSort): string {
  return `${sort.field}:${sort.direction}`;
}

function setOrRemove(params: URLSearchParams, name: string, value: string): void {
  if (value.length > 0) {
    params.set(name, value);
  } else {
    params.delete(name);
  }
}

// The end of the scoring window. Today is used when the URL has no valid date.
export function readFrom(params: URLSearchParams): string {
  const from = params.get('from') ?? '';
  return isIsoDate(from) ? from : todayAsIsoDate();
}

// Anyone can type a URL, so a value we don't recognise falls back to its default.
export function readFilters(params: URLSearchParams): TransactionFilters {
  const categoryCodes = (params.get('categories') ?? '').split(',').filter(Boolean);
  const sign = params.get('sign') ?? '';
  return {
    categoryCodes: [...new Set(categoryCodes)],
    sign: isSign(sign) ? sign : DEFAULT_FILTERS.sign,
    search: params.get('search') ?? DEFAULT_FILTERS.search,
    sort: readSort(params.get('sort') ?? ''),
  };
}

// Defaults are left out so a plain view keeps a short URL.
export function writeFilters(
  params: URLSearchParams,
  filters: TransactionFilters,
): URLSearchParams {
  const sort = formatSort(filters.sort);
  const nextParams = new URLSearchParams(params);
  setOrRemove(nextParams, 'categories', filters.categoryCodes.join(','));
  setOrRemove(nextParams, 'sign', filters.sign === DEFAULT_FILTERS.sign ? '' : filters.sign);
  setOrRemove(nextParams, 'search', filters.search);
  setOrRemove(nextParams, 'sort', sort === formatSort(DEFAULT_FILTERS.sort) ? '' : sort);
  return nextParams;
}

// Categories and searches belong to one person's transactions, so only the date carries over.
export function paramsForNewUser(params: URLSearchParams): URLSearchParams {
  const nextParams = new URLSearchParams();
  setOrRemove(nextParams, 'from', params.get('from') ?? '');
  return nextParams;
}
