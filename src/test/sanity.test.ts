import { describe, expect, it } from 'vitest';

describe('sanity', () => {
  it('confirms the test runner executes assertions', () => {
    expect(1 + 1).toBe(2);
  });
});
