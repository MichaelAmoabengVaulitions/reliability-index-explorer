import type { ReliabilityResponse } from '@/api/schemas';
import { config } from '@/config';
import { colors } from '@/theme';

import {
  arcPath,
  gaugeLayout,
  MAX_SCORE,
  MIN_SCORE,
  polarToCartesian,
  scoreToDegrees,
  STROKE_WIDTH,
} from './gaugeGeometry';

interface ScoreGaugeProps {
  /** The reliability score, expected to be a whole number from 0 to 100. */
  score: number;
  /** Which band the score falls into. Drives the colour of the score number. */
  band: ReliabilityResponse['score_band'];
  /** Overall width of the gauge in pixels. The height is about half of this. */
  size?: number;
}

const DEFAULT_SIZE = 320;

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

/**
 * Half-circle gauge that shows the reliability score as a needle pointing
 * along a red/amber/green arc. The score number sits below the arc, coloured
 * to match the band so the value and the visual signal agree.
 *
 * The arc and needle positions are worked out by ./gaugeGeometry.
 */
export function ScoreGauge({ score, band, size = DEFAULT_SIZE }: ScoreGaugeProps) {
  const { width, height, centerX, centerY, radius, needleRadius } = gaugeLayout(size);
  const needleTip = polarToCartesian(centerX, centerY, needleRadius, scoreToDegrees(score));

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
