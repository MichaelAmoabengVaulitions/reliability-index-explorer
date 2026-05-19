// A small lookup from a merchant category code to a friendly name shown in
// the UI. We seed this with the codes that actually appear in our fixture
// transactions (ISO 18245 codes); any code we have not labelled yet falls
// back to the raw number so the explorer never invents names.
const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  '4900': 'Utilities',
  '5411': 'Grocery Stores',
  '5732': 'Electronics Stores',
  '5814': 'Eating Places',
  '6011': 'Cash & Payroll',
  '6513': 'Real Estate Rentals',
};

/**
 * Returns the friendly name for a merchant category code, or the raw code
 * itself when no friendly name is registered. We do not normalise the input
 * (no trimming, no padding) — the API hands these to us as exact strings.
 */
export function categoryLabel(code: string): string {
  return CATEGORY_LABELS[code] ?? code;
}
