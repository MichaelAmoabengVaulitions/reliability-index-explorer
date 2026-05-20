export type DriverKind = 'positive' | 'risk' | 'neutral';

// Shown in place of a coverage ratio the backend could not compute.
const NO_RATIO_PLACEHOLDER = '—';

// Renders the income-to-expenses coverage ratio for display. A number becomes
// e.g. "1.41x"; null (which the backend sends when the user has no essential
// expenses, so there is no ratio to compute) becomes a dash.
export function formatCoverageRatio(value: number | null): string {
  if (value === null) {
    return NO_RATIO_PLACEHOLDER;
  }
  return `${value.toFixed(2)}x`;
}

// The backend's driver strings are short and a little terse (for example
// "2.03x essential expenses"). We pair each one with a plain caption that
// says what the line is telling the reader. The caption is matched on a
// keyword in the driver, never on the numbers inside it — so if the backend
// rephrases a driver we lose the caption rather than show a wrong one.
//
// Each entry: a pattern that identifies the scoring signal, and the plain
// sentence to show under any driver that matches it. Checked in order.
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

// Returns a plain one-line caption explaining what a driver line is about,
// or undefined when the driver does not match any signal we recognise.
export function captionForDriver(driver: string): string | undefined {
  return DRIVER_CAPTIONS.find((entry) => entry.pattern.test(driver))?.caption;
}

export interface ParsedDriver {
  raw: string;
  label: string;
  points?: number;
  kind: DriverKind;
}

// Matches an optional sign, one or more digits, the literal " pts" suffix, and any
// surrounding whitespace — anchored to the end of the string so a "(+5 pts)" appearing
// mid-sentence is left alone.
const POINTS_SUFFIX = /\s*\(([+-]?\d+)\s*pts\)\s*$/;

// Splits the API's pre-rendered driver string into its descriptive label and an optional
// numeric points contribution. The points value classifies the driver as positive, risk,
// or neutral so the UI can render it under the right column.
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
