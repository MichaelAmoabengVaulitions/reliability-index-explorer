import { config } from '@/config';

// We pin to a single locale defined in config.ts so the formatted output is identical
// on every machine, which keeps tests stable and lets us switch the whole app's currency
// formatting in one place if the team ever decides to render in a different locale.
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    // An invalid currency code (one that Intl rejects, not just an unfamiliar one)
    // falls back to a plain number with the code appended so we never crash on bad data.
    const plain = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${plain} ${currency}`;
  }
}
