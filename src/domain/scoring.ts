export type DriverKind = 'positive' | 'risk' | 'neutral';

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
