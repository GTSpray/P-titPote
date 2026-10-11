import { logger } from '../logger.js';
import { computeBackoff } from './backoff.js';
import type { GatewaySocket } from './GatewaySocket.js';

const defaultWait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * The first connection is not covered by the shard recovery loop: retry it so
 * a transient Discord/network failure at boot does not leave a silent process.
 */
export async function connectWithRetry(
  gateway: Pick<GatewaySocket, 'connect'>,
  options: {
    maxAttempts?: number;
    wait?: (ms: number) => Promise<void>;
    random?: () => number;
  } = {},
): Promise<void> {
  const { maxAttempts = 5, wait = defaultWait, random } = options;
  for (let attempt = 1; ; attempt++) {
    try {
      await gateway.connect();
      return;
    } catch (error) {
      logger.error('gateway connect failed', { attempt, maxAttempts, error });
      if (attempt >= maxAttempts) {
        throw error;
      }
      await wait(computeBackoff(attempt, random));
    }
  }
}
