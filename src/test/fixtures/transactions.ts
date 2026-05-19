import type { Transaction } from '@/api/schemas';

const DEFAULTS = {
  userId: 'user_1001',
  from: '2025-09-01',
  to: '2026-02-20',
};

const FIXED_AMOUNTS = {
  salary: 3000,
  rent: -1200,
};

const SHUFFLE_RATIO = 0.05;
const ID_WIDTH = 4;
const MS_PER_DAY = 86_400_000;
const SECONDS_PER_DAY = 86_400;
const AMOUNT_CENTS = 100;
const SALARY_HOUR_SECONDS = 9 * 3600;
const RENT_HOUR_SECONDS = 10 * 3600;
const SECOND_IN_MS = 1000;

interface BuildTransactionsOptions {
  userId?: string;
  from?: string;
  to?: string;
}

interface MerchantTemplate {
  category: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
}

const MERCHANT_TEMPLATES: readonly MerchantTemplate[] = [
  { category: '5411', name: 'Whole Foods Market', description: 'Grocery purchase', minAmount: -80, maxAmount: -20 },
  { category: '5411', name: 'Trader Joes', description: 'Grocery purchase', minAmount: -80, maxAmount: -20 },
  { category: '4900', name: 'City Electric Co', description: 'Monthly utility', minAmount: -150, maxAmount: -50 },
  { category: '4900', name: 'Telecom Provider', description: 'Internet bill', minAmount: -150, maxAmount: -50 },
  { category: '5814', name: 'Cafe Central', description: 'Coffee purchase', minAmount: -15, maxAmount: -5 },
  { category: '5732', name: 'Electronics Store', description: 'Misc purchase', minAmount: -500, maxAmount: -50 },
];

// Returns a function that yields the next pseudo-random number in [0, 1) on each call.
// Same seed always produces the same sequence — that's what makes fixture output reproducible.
// Implementation: Mulberry32, a 32-bit PRNG (small, fast, non-cryptographic).
function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hashes a string into a 32-bit unsigned integer so different option combinations
// deterministically map to different RNG seeds.
// Implementation: FNV-1a (small, fast, non-cryptographic).
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseDate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(date: Date, secondsOfDay: number): string {
  const dayStart = parseDate(formatDate(date));
  return new Date(dayStart.getTime() + secondsOfDay * SECOND_IN_MS).toISOString();
}

function formatId(counter: number): string {
  return `tx_${String(counter).padStart(ID_WIDTH, '0')}`;
}

function buildSalaryAndRent(
  userId: string,
  monthFirst: Date,
  firstId: number,
): [Transaction, Transaction] {
  const accountId = `acc_${userId}`;
  const date = formatDate(monthFirst);
  const salary: Transaction = {
    id: formatId(firstId),
    account_id: accountId,
    user_id: userId,
    amount: FIXED_AMOUNTS.salary,
    currency: 'EUR',
    date,
    description: 'Monthly salary',
    merchant_category_code: '6011',
    merchant_name: 'Employer Payroll',
    type: 'credit',
    synced_at: formatDateTime(monthFirst, SALARY_HOUR_SECONDS),
  };
  const rent: Transaction = {
    id: formatId(firstId + 1),
    account_id: accountId,
    user_id: userId,
    amount: FIXED_AMOUNTS.rent,
    currency: 'EUR',
    date,
    description: 'Monthly rent',
    merchant_category_code: '6513',
    merchant_name: 'Property Manager',
    type: 'debit',
    synced_at: formatDateTime(monthFirst, RENT_HOUR_SECONDS),
  };
  return [salary, rent];
}

function buildRandomExpense(
  userId: string,
  fromDate: Date,
  totalDays: number,
  txId: number,
  rng: () => number,
): Transaction {
  const templateIdx = Math.floor(rng() * MERCHANT_TEMPLATES.length);
  // bounds-checked: templateIdx ∈ [0, MERCHANT_TEMPLATES.length)
  const template = MERCHANT_TEMPLATES[templateIdx]!;
  const dayOffset = Math.floor(rng() * (totalDays + 1));
  const day = new Date(fromDate.getTime() + dayOffset * MS_PER_DAY);
  const range = template.maxAmount - template.minAmount;
  const raw = template.minAmount + rng() * range;
  const amount = Math.round(raw * AMOUNT_CENTS) / AMOUNT_CENTS;
  const secondsOfDay = Math.floor(rng() * SECONDS_PER_DAY);

  return {
    id: formatId(txId),
    account_id: `acc_${userId}`,
    user_id: userId,
    amount,
    currency: 'EUR',
    date: formatDate(day),
    description: template.description,
    merchant_category_code: template.category,
    merchant_name: template.name,
    type: amount > 0 ? 'credit' : 'debit',
    synced_at: formatDateTime(day, secondsOfDay),
  };
}

// Swap adjacent pairs at the given ratio so callers see arbitrarily ordered data.
function shuffleAdjacent<T>(items: T[], rng: () => number, ratio: number): T[] {
  const result = items.slice();
  const swapCount = Math.floor(result.length * ratio);
  for (let i = 0; i < swapCount; i++) {
    const idx = Math.floor(rng() * Math.max(0, result.length - 1));
    // both indices ∈ [0, result.length - 1] by construction
    const a = result[idx]!;
    const b = result[idx + 1]!;
    result[idx] = b;
    result[idx + 1] = a;
  }
  return result;
}

function* monthFirsts(fromDate: Date, toDate: Date): Generator<Date> {
  const cursor = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1));
  while (cursor <= toDate) {
    if (cursor >= fromDate) yield new Date(cursor.getTime());
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
}

export function buildTransactions(
  count: number,
  options: BuildTransactionsOptions = {},
): Transaction[] {
  const userId = options.userId ?? DEFAULTS.userId;
  const from = options.from ?? DEFAULTS.from;
  const to = options.to ?? DEFAULTS.to;

  const seed = hashString(`${userId}|${from}|${to}`);
  const rng = createSeededRng(seed);

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  const totalDays = Math.floor((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY);

  const result: Transaction[] = [];
  let nextId = 1;

  for (const monthFirst of monthFirsts(fromDate, toDate)) {
    if (result.length >= count) break;
    const [salary, rent] = buildSalaryAndRent(userId, monthFirst, nextId);
    result.push(salary);
    nextId++;
    if (result.length >= count) break;
    result.push(rent);
    nextId++;
  }

  while (result.length < count) {
    result.push(buildRandomExpense(userId, fromDate, totalDays, nextId, rng));
    nextId++;
  }

  return shuffleAdjacent(result, rng, SHUFFLE_RATIO);
}
