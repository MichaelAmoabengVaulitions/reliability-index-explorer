/*
 * A small lookup from a merchant category code to a friendly name shown in
 * the app. It is filled in with the codes that actually appear in our sample
 * transactions; any code we have not given a name to shows as the raw
 * number, so the explorer never makes up a name.
 */
const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  '4900': 'Utilities',
  '5411': 'Grocery Stores',
  '5732': 'Electronics Stores',
  '5814': 'Eating Places',
  '6011': 'Cash & Payroll',
  '6513': 'Real Estate Rentals',
};

/**
 * Returns the friendly name for a merchant category code, or the code itself
 * when we have no name for it. We do not change the input at all (no
 * trimming, no padding); the API gives us these as exact strings.
 */
export function categoryLabel(code: string): string {
  return CATEGORY_LABELS[code] ?? code;
}
