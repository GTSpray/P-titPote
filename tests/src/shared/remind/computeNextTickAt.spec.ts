import { computeNextTickAt } from '../../../../src/shared/remind/computeNextTickAt.js';

describe('computeNextTickAt', () => {
  it('should add idle days to the reference date', () => {
    expect(
      computeNextTickAt(new Date('2026-09-11T12:00:00.000Z'), 2).toISOString(),
    ).toBe('2026-09-13T12:00:00.000Z');
  });
});
