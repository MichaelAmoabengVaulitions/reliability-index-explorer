import { describe, expect, it } from 'vitest';

import {
  MAX_SCORE,
  MIN_SCORE,
  STROKE_WIDTH,
  arcPath,
  gaugeLayout,
  polarToCartesian,
  scoreToDegrees,
} from './gaugeGeometry';

describe('scoreToDegrees', () => {
  it('places the lowest score at the start of the arc, on the left', () => {
    expect(scoreToDegrees(MIN_SCORE)).toBe(270);
  });

  it('places the mid score at the top of the arc', () => {
    expect(scoreToDegrees(50)).toBe(360);
  });

  it('places the highest score at the end of the arc, on the right', () => {
    expect(scoreToDegrees(MAX_SCORE)).toBe(450);
  });

  it('keeps a score below the range at the start of the arc', () => {
    expect(scoreToDegrees(-25)).toBe(scoreToDegrees(MIN_SCORE));
  });

  it('keeps a score above the range at the end of the arc', () => {
    expect(scoreToDegrees(250)).toBe(scoreToDegrees(MAX_SCORE));
  });
});

describe('polarToCartesian', () => {
  it('points straight up at 0 degrees', () => {
    const point = polarToCartesian(100, 100, 10, 0);
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(90);
  });

  it('points to the right at 90 degrees', () => {
    const point = polarToCartesian(100, 100, 10, 90);
    expect(point.x).toBeCloseTo(110);
    expect(point.y).toBeCloseTo(100);
  });

  it('points to the left at 270 degrees', () => {
    const point = polarToCartesian(100, 100, 10, 270);
    expect(point.x).toBeCloseTo(90);
    expect(point.y).toBeCloseTo(100);
  });
});

describe('arcPath', () => {
  it('starts with a move command and draws a single arc of the given radius', () => {
    const path = arcPath(100, 100, 50, scoreToDegrees(MIN_SCORE), scoreToDegrees(MAX_SCORE));
    expect(path.startsWith('M ')).toBe(true);
    expect(path).toContain(' A 50 50 ');
  });
});

describe('gaugeLayout', () => {
  it('makes the box half as tall as it is wide, plus the arc thickness', () => {
    const layout = gaugeLayout(320);
    expect(layout.width).toBe(320);
    expect(layout.height).toBe(160 + STROKE_WIDTH);
  });

  it('keeps the arc and the needle inside the box for every score', () => {
    const layout = gaugeLayout(320);
    for (const score of [MIN_SCORE, 10, 25, 50, 64, 75, MAX_SCORE]) {
      const arcPoint = polarToCartesian(
        layout.centerX,
        layout.centerY,
        layout.radius,
        scoreToDegrees(score),
      );
      const needleTip = polarToCartesian(
        layout.centerX,
        layout.centerY,
        layout.needleRadius,
        scoreToDegrees(score),
      );
      for (const point of [arcPoint, needleTip]) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(layout.width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(layout.height);
      }
    }
  });
});
