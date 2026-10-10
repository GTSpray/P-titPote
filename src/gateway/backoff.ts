export const MIN_RECONNECT_DELAY_MS = 1000;
export const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Exponential backoff with jitter. The first attempt is immediate so a
 * regular server-side disconnect is recovered without any delay.
 */
export function computeBackoff(
  attempts: number,
  random: () => number = Math.random,
  minDelayMs = MIN_RECONNECT_DELAY_MS,
  maxDelayMs = MAX_RECONNECT_DELAY_MS,
): number {
  if (attempts <= 0) {
    return 0;
  }
  const exp = Math.min(maxDelayMs, minDelayMs * 2 ** (attempts - 1));
  const jitter = Math.floor(random() * minDelayMs);
  return Math.min(maxDelayMs, exp + jitter);
}
