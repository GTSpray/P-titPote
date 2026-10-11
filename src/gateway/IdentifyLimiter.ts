/**
 * Discord allows 1000 Identify calls per 24h and resets the bot token when the
 * limit is exceeded. This sliding window keeps a reconnect loop far below it.
 */
export class IdentifyLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly maxPerWindow = 20,
    private readonly windowMs = 60 * 60 * 1000,
    private readonly now: () => number = Date.now,
  ) {}

  private prune() {
    const threshold = this.now() - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] <= threshold) {
      this.timestamps.shift();
    }
  }

  record() {
    this.prune();
    this.timestamps.push(this.now());
  }

  count(): number {
    this.prune();
    return this.timestamps.length;
  }

  /** Milliseconds to wait before another Identify is allowed (0 when allowed). */
  msUntilAvailable(): number {
    this.prune();
    if (this.timestamps.length < this.maxPerWindow) {
      return 0;
    }
    const oldest = this.timestamps[this.timestamps.length - this.maxPerWindow];
    return Math.max(0, oldest + this.windowMs - this.now());
  }
}
