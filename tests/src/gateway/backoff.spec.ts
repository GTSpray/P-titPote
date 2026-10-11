import {
  computeBackoff,
  MAX_RECONNECT_DELAY_MS,
  MIN_RECONNECT_DELAY_MS,
} from '../../../src/gateway/backoff.js';

describe('computeBackoff', () => {
  it('is immediate on the first attempt', () => {
    expect(computeBackoff(0, () => 0.99)).toBe(0);
  });

  it.each([
    [1, 1000],
    [2, 2000],
    [3, 4000],
    [4, 8000],
    [5, 16000],
  ])('doubles the delay on attempt %i (no jitter)', (attempt, expected) => {
    expect(computeBackoff(attempt, () => 0)).toBe(expected);
  });

  it('adds up to one minimum delay of jitter', () => {
    expect(computeBackoff(1, () => 0.5)).toBe(MIN_RECONNECT_DELAY_MS * 1.5);
    expect(computeBackoff(2, () => 0.999)).toBeLessThan(
      2 * MIN_RECONNECT_DELAY_MS + MIN_RECONNECT_DELAY_MS,
    );
  });

  it('never exceeds the maximum delay', () => {
    expect(computeBackoff(50, () => 0.999)).toBe(MAX_RECONNECT_DELAY_MS);
    expect(computeBackoff(6, () => 0.999)).toBe(MAX_RECONNECT_DELAY_MS);
  });
});
