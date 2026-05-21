import type { ReliabilityResponse } from '@/api/schemas';
import { config } from '@/config';
import { colors } from '@/theme';

interface ScoreGaugeProps {
  /** The reliability score, expected to be a whole number from 0 to 100. */
  score: number;
  /** Which band the score falls into. Drives the colour of the score number. */
  band: ReliabilityResponse['score_band'];
  /** Overall width of the gauge in pixels. The height is half of this. */
  size?: number;
}

/*
 * Numbers that lay out the half-circle gauge. The arc sweeps from 9 o'clock
 * (180 degrees) round to 3 o'clock (360 degrees), which is the bottom half of
 * a circle.
 */
const QUARTER_TURN_DEGREES = 90;
const HALF_CIRCLE_DEGREES = 180;
const ARC_START_DEGREES = HALF_CIRCLE_DEGREES;
const ARC_END_DEGREES = HALF_CIRCLE_DEGREES * 2;
const ARC_TOTAL_DEGREES = ARC_END_DEGREES - ARC_START_DEGREES;
const DEFAULT_SIZE = 320;
const STROKE_WIDTH = 28;
const MIN_SCORE = 0;
const MAX_SCORE = 100;
/*
 * The three coloured parts of the arc. Each one starts and ends at a score
 * band cut-off from config, so the coloured zone the needle sits in always
 * matches the band the backend reports.
 */
const SEGMENTS = [
  { fromScore: MIN_SCORE, toScore: config.scoring.mediumBandMin, color: colors.band.low },
  {
    fromScore: config.scoring.mediumBandMin,
    toScore: config.scoring.highBandMin,
    color: colors.band.medium,
  },
  { fromScore: config.scoring.highBandMin, toScore: MAX_SCORE, color: colors.band.high },
];
const BAND_TEXT_COLOR: Record<ReliabilityResponse['score_band'], string> = {
  LOW: 'text-band-low',
  MEDIUM: 'text-band-medium',
  HIGH: 'text-band-high',
};

function polarToCartesian(centerX: number, centerY: number, radius: number, degrees: number) {
  // SVG angles start at 3 o'clock, so subtract a quarter turn to make 0 degrees point up.
  const radians = ((degrees - QUARTER_TURN_DEGREES) * Math.PI) / HALF_CIRCLE_DEGREES;
  return { x: centerX + radius * Math.cos(radians), y: centerY + radius * Math.sin(radians) };
}

function arcPath(
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

function scoreToDegrees(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return ARC_START_DEGREES + (clamped / 100) * ARC_TOTAL_DEGREES;
}

/**
 * Half-circle gauge that shows the reliability score as a needle pointing
 * along a red/amber/green arc. The score number sits in the middle, coloured
 * to match the band so the value and the visual signal agree.
 */
export function ScoreGauge({ score, band, size = DEFAULT_SIZE }: ScoreGaugeProps) {
  const width = size;
  const height = size / 2 + STROKE_WIDTH;
  const centerX = width / 2;
  const centerY = size / 2;
  const radius = size / 2 - STROKE_WIDTH / 2;
  const needleDegrees = scoreToDegrees(score);
  const needleTip = polarToCartesian(centerX, centerY, radius - STROKE_WIDTH / 2, needleDegrees);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`Reliability score ${score} out of 100, ${band.toLowerCase()} band`}
      >
        {SEGMENTS.map((segment) => (
          <path
            key={segment.fromScore}
            d={arcPath(
              centerX,
              centerY,
              radius,
              scoreToDegrees(segment.fromScore),
              scoreToDegrees(segment.toScore),
            )}
            stroke={segment.color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="butt"
            fill="none"
          />
        ))}
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={colors.chart.ink}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r="6" fill={colors.chart.ink} />
      </svg>
      <p className={`mt-2 text-score ${BAND_TEXT_COLOR[band]}`}>{score}</p>
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">out of 100</p>
    </div>
  );
}
