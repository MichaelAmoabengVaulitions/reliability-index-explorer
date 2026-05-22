/*
 * The geometry of the reliability score gauge.
 *
 * The gauge is a half-circle whose coloured arc sweeps across the top of a
 * circle: it begins at 9 o'clock on the left, climbs over 12 o'clock, and ends
 * at 3 o'clock on the right. A low score sits at the left end, a high score at
 * the right.
 *
 * This maths is kept apart from the ScoreGauge component so it can be checked
 * on its own, without rendering anything.
 */

export interface Point {
  x: number;
  y: number;
}

const QUARTER_TURN_DEGREES = 90;
const HALF_CIRCLE_DEGREES = 180;

// The arc begins at 9 o'clock and sweeps half a circle round to 3 o'clock.
const ARC_START_DEGREES = HALF_CIRCLE_DEGREES + QUARTER_TURN_DEGREES;

/** The lowest and highest reliability score the gauge shows. */
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

/** Thickness of the coloured arc band, in pixels. */
export const STROKE_WIDTH = 28;

export interface GaugeLayout {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  /** Radius of the centre line of the coloured arc band. */
  radius: number;
  /** Length of the needle, kept just short of the arc band. */
  needleRadius: number;
}

/*
 * Works out the box and circle measurements for a gauge of the given overall
 * width. The box is half as tall as it is wide, plus the arc's thickness, so
 * the arc that sweeps the top sits fully inside it.
 */
export function gaugeLayout(size: number): GaugeLayout {
  const radius = size / 2 - STROKE_WIDTH / 2;
  return {
    width: size,
    height: size / 2 + STROKE_WIDTH,
    centerX: size / 2,
    centerY: size / 2,
    radius,
    needleRadius: radius - STROKE_WIDTH / 2,
  };
}

/*
 * Turns an angle into a point on a circle. SVG angles begin at 3 o'clock, so a
 * quarter turn is taken off first to make 0 degrees point straight up.
 */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  degrees: number,
): Point {
  const radians = ((degrees - QUARTER_TURN_DEGREES) * Math.PI) / HALF_CIRCLE_DEGREES;
  return { x: centerX + radius * Math.cos(radians), y: centerY + radius * Math.sin(radians) };
}

/*
 * Builds the SVG path string for one coloured arc band, running between the
 * two given angles.
 */
export function arcPath(
  centerX: number,
  centerY: number,
  radius: number,
  startDegrees: number,
  endDegrees: number,
): string {
  const start = polarToCartesian(centerX, centerY, radius, endDegrees);
  const end = polarToCartesian(centerX, centerY, radius, startDegrees);
  const largeArc = endDegrees - startDegrees <= HALF_CIRCLE_DEGREES ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/*
 * Maps a reliability score to the angle of its place on the arc. The score is
 * kept within range first, so a stray value cannot push the needle off the
 * end of the arc.
 */
export function scoreToDegrees(score: number): number {
  const clamped = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  return ARC_START_DEGREES + (clamped / MAX_SCORE) * HALF_CIRCLE_DEGREES;
}
