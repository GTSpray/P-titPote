import {
  computeNextTickAt,
  isOlderThanIdleDays,
} from '../../../src/utils/remindConstants.js';

describe('isOlderThanIdleDays', () => {
  const now = new Date('2026-09-11T12:00:00.000Z');

  it('should be false when under the threshold', () => {
    expect(
      isOlderThanIdleDays(new Date('2026-09-10T12:00:01.000Z'), 1, now),
    ).toBe(false);
  });

  it('should be true when at or past the threshold', () => {
    expect(
      isOlderThanIdleDays(new Date('2026-09-10T12:00:00.000Z'), 1, now),
    ).toBe(true);
  });
});

describe('computeNextTickAt', () => {
  it('should add idle days to the reference date', () => {
    expect(
      computeNextTickAt(new Date('2026-09-11T12:00:00.000Z'), 2).toISOString(),
    ).toBe('2026-09-13T12:00:00.000Z');
  });
});
