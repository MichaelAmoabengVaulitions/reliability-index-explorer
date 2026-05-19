import { config } from '@/config';

export interface ScoringWindow {
  start: string;
  end: string;
}

export function parseISODate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

// Renders a date as the abbreviated month and year, for example "Feb 2026".
// We force UTC so the displayed month matches the underlying calendar date and never
// shifts because of the viewer's local timezone.
export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat(config.locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Returns the six-calendar-month scoring window ending at the `from` date.
// Example: from "2026-02-20" gives { start: "2025-09-01", end: "2026-02-20" }.
// We subtract one less than the window length because the `from` month itself counts
// as the sixth month — so a six-month window goes back five whole months from there.
export function windowFor(from: string): ScoringWindow {
  const fromDate = parseISODate(from);
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();
  const monthsBack = config.api.scoringWindowMonths - 1;
  const start = new Date(Date.UTC(year, month - monthsBack, 1));
  return {
    start: formatISODate(start),
    end: from,
  };
}

function formatISODate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${monthKey(date)}-${day}`;
}

// Today's UTC calendar day as YYYY-MM-DD. Backend and store both speak UTC, so we
// never want to fall back to the viewer's local timezone here.
export function todayAsIsoDate(): string {
  return formatISODate(new Date());
}
