export type DriverKind = 'positive' | 'risk' | 'neutral';

// Shown in place of a coverage ratio the backend could not work out.
const NO_RATIO_PLACEHOLDER = '—';

/*
 * Formats the income-to-expenses coverage ratio for display. A number shows
 * as, for example, "1.41x". Null (which the backend sends when the user has
 * no essential expenses, so there is no ratio) shows as a dash.
 */
export function formatCoverageRatio(value: number | null): string {
  if (value === null) {
    return NO_RATIO_PLACEHOLDER;
  }
  return `${value.toFixed(2)}x`;
}

/*
 * The backend's driver lines are short and a little compact (for example
 * "2.03x essential expenses"). We pair each one with a plain caption that
 * says what the line is telling the reader. The caption is matched on a
 * keyword in the driver, never on the numbers inside it, so if the backend
 * rewords a driver we simply lose the caption rather than show a wrong one.
 *
 * Each entry below is a pattern that recognises one kind of driver, and the
 * plain sentence to show under any driver line that matches it. Checked in
 * order.
 */
const DRIVER_CAPTIONS: ReadonlyArray<{ pattern: RegExp; caption: string }> = [
  { pattern: /income present/i, caption: 'How regularly income arrived during the window.' },
  {
    pattern: /coverage|covers essential/i,
    caption: 'Whether income was enough to cover the essential bills.',
  },
  {
    pattern: /essential payments/i,
    caption: 'Whether essential bills were paid on a regular schedule.',
  },
  { pattern: /savings|surplus/i, caption: 'Money regularly set aside.' },
  { pattern: /negative balance/i, caption: 'Days the account was overdrawn.' },
  { pattern: /late fee/i, caption: 'Charges for paying a bill late.' },
  { pattern: /cashflow month/i, caption: 'Months that ended in good financial shape.' },
  { pattern: /high-risk|risk category/i, caption: 'Spending in higher-risk categories.' },
];

/*
 * Returns a plain one-line caption saying what a driver line is about, or
 * undefined when the driver does not match any kind we recognise.
 */
export function captionForDriver(driver: string): string | undefined {
  return DRIVER_CAPTIONS.find((entry) => entry.pattern.test(driver))?.caption;
}

export interface ParsedDriver {
  raw: string;
  label: string;
  points?: number;
  kind: DriverKind;
}

/*
 * This pattern finds a points value like "(+5 pts)" or "(-10 pts)" at the
 * very end of a driver string. It only matches at the end, so a "(+5 pts)"
 * in the middle of a sentence is left alone.
 */
const POINTS_SUFFIX = /\s*\(([+-]?\d+)\s*pts\)\s*$/;

/*
 * Splits a driver string from the API into its wording and an optional points
 * value. The points decide whether the driver counts as positive, a risk, or
 * neutral, so the UI can show it under the right column.
 */
export function parseDriver(raw: string): ParsedDriver {
  const match = raw.match(POINTS_SUFFIX);
  if (match === null) {
    return { raw, label: raw.trim(), kind: 'neutral' };
  }
  const points = Number(match[1]);
  const label = raw.replace(POINTS_SUFFIX, '').trim();
  if (points === 0) {
    return { raw, label, points: 0, kind: 'neutral' };
  }
  return {
    raw,
    label,
    points,
    kind: points > 0 ? 'positive' : 'risk',
  };
}
