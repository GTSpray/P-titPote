import { IdentifyLimiter } from '../../../src/gateway/IdentifyLimiter.js';

describe('IdentifyLimiter', () => {
  let now: number;
  const clock = () => now;

  beforeEach(() => {
    now = 1_000_000;
  });

  it('allows identify while under the limit', () => {
    const limiter = new IdentifyLimiter(2, 1000, clock);
    limiter.record();
    expect(limiter.msUntilAvailable()).toBe(0);
    expect(limiter.count()).toBe(1);
  });

  it('delays identify until the oldest one leaves the window', () => {
    const limiter = new IdentifyLimiter(2, 1000, clock);
    limiter.record();
    now += 300;
    limiter.record();
    now += 100;

    expect(limiter.msUntilAvailable()).toBe(600);
  });

  it('forgets identifies older than the window', () => {
    const limiter = new IdentifyLimiter(1, 1000, clock);
    limiter.record();
    now += 1000;

    expect(limiter.count()).toBe(0);
    expect(limiter.msUntilAvailable()).toBe(0);
  });
});
