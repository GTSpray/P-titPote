import { logger } from '../logger.js';
import { t } from '../i18n/index.js';
import { notifyBotOwner } from '../utils/notifyBotOwner.js';
import type { GatewaySocket } from './GatewaySocket.js';
import { GWSEvent } from './gatewaytypes.js';

const notifyTimeoutMs = 5000;
const shutdownTimeoutMs = 5000;
const flushTimeoutMs = 1000;

/** Let winston flush its transports before leaving. */
export function exitAfterFlush(code: number): void {
  const timer = setTimeout(() => process.exit(code), flushTimeoutMs);
  logger.once('finish', () => {
    clearTimeout(timer);
    process.exit(code);
  });
  logger.end();
}

const withTimeout = (promise: Promise<unknown>, ms: number) =>
  Promise.race([
    promise.catch(() => {}),
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    }),
  ]);

type SuperviseOptions = {
  exit?: (code: number) => void;
  notify?: (content: string) => Promise<void>;
  signals?: Pick<NodeJS.Process, 'once'>;
};

/**
 * A fatal close (bad token, intents, sharding) can never be recovered by
 * reconnecting: leave the process so the container supervisor restarts it
 * and the owner is told. SIGTERM/SIGINT close the sessions cleanly.
 */
export function superviseGateway(
  gateway: GatewaySocket,
  {
    exit = exitAfterFlush,
    notify = notifyBotOwner,
    signals = process,
  }: SuperviseOptions = {},
) {
  let leaving = false;

  gateway.on(GWSEvent.Fatal, (shard, { code, reason }) => {
    if (leaving) {
      return;
    }
    leaving = true;
    logger.error('gateway fatal close, exiting', { shard, code, reason });
    void withTimeout(
      notify(t('startup.dm.gatewayFatal', { code, reason })),
      notifyTimeoutMs,
    ).then(() => exit(1));
  });

  const onSignal = (signal: NodeJS.Signals) => {
    if (leaving) {
      return;
    }
    leaving = true;
    logger.info('gateway shutting down', { signal });
    void withTimeout(gateway.destroy(), shutdownTimeoutMs).then(() => exit(0));
  };
  signals.once('SIGTERM', onSignal);
  signals.once('SIGINT', onSignal);
}
