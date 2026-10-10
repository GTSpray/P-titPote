import WebSocket from 'ws';
import { GatewaySocket } from './GatewaySocket.js';
import {
  GatewayDispatchEvents,
  GatewayHeartbeatAck,
  GatewayHello,
  GatewayIntentBits,
  GatewayInvalidSession,
  GatewayOpcodes,
} from 'discord-api-types/v10';
import { WsClosedCode, GWSEvent } from './gatewaytypes.js';
import {
  CLIENT_RECONNECT_CLOSE_CODE,
  CLIENT_SHUTDOWN_CLOSE_CODE,
  RATE_LIMITED_MIN_DELAY_MS,
  SLOW_RECONNECT_CLOSE_CODES,
  classifyCloseCode,
  getStatusCodeString,
} from './closeCodes.js';
import { getPromiseWithTimeout } from '../utils/getPromiseWithTimeout.js';
import { logger } from '../logger.js';

const encoding = 'json';
const apiVersion = '10';

// todo: implement erlpack https://github.com/discord/erlpack
const s = JSON.stringify;
const onConnectionDelay = 20;
const invalidSessionResumeDelayMs = 1000;
const minReconnectDelayMs = 1000;
const maxReconnectDelayMs = 30_000;

const noop = () => {};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export class ShardSocket {
  ws: null | WebSocket;
  heartbitInterval: number;
  heartbitTimer: null | ReturnType<typeof setTimeout>;
  heartbitTimeOut: null | ReturnType<typeof setTimeout>;
  s: number | null;
  session_id: string | null;
  shard: number;
  main: GatewaySocket;
  jitter: number;
  maxTimeout: number;
  resumeGatewayUrl: string | null;
  destroyed: boolean = false;
  private intentionalClose = false;
  private recovering = false;
  private reconnectAttempts = 0;
  private readyListener: ((payload: { event: any }) => void) | null = null;
  private resumedListener: (() => void) | null = null;

  openPromise: null | Promise<void>;
  closePromise: null | Promise<void>;
  resumePromise: null | Promise<void>;

  static maxTimeout = 7000;

  constructor(main: GatewaySocket, shard: number) {
    this.ws = null;
    this.heartbitInterval = 0;
    this.heartbitTimer = null;
    this.s = null;
    this.session_id = null;
    this.shard = shard;
    this.main = main;
    this.jitter = Math.random();
    this.maxTimeout = ShardSocket.maxTimeout;
    this.resumeGatewayUrl = null;
    this.heartbitTimeOut = null;

    this.openPromise = null;
    this.resumePromise = null;
    this.closePromise = null;
  }

  private clearHeartbeats() {
    if (this.heartbitTimer) {
      clearTimeout(this.heartbitTimer);
      this.heartbitTimer = null;
    }
    if (this.heartbitTimeOut) {
      clearTimeout(this.heartbitTimeOut);
      this.heartbitTimeOut = null;
    }
  }

  private canResume(): boolean {
    return Boolean(this.session_id && this.resumeGatewayUrl);
  }

  private detachSocketListeners(ws: WebSocket | null) {
    if (!ws) {
      return;
    }
    ws.removeAllListeners('message');
    ws.removeAllListeners('close');
    ws.removeAllListeners('error');
    ws.removeAllListeners('open');
    // closing a CONNECTING socket emits 'error'; without a listener it would crash the process
    ws.on('error', noop);
  }

  private isSocketActive(ws: WebSocket | null): ws is WebSocket {
    return (
      ws != null &&
      ![WebSocket.CLOSED, WebSocket.CLOSING].includes(<any>ws.readyState)
    );
  }

  /** Drop the current socket without waiting for a clean close handshake. */
  private discardSocket() {
    const ws = this.ws;
    if (!ws) {
      return;
    }
    this.intentionalClose = true;
    this.detachSocketListeners(ws);
    this.clearHeartbeats();
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(CLIENT_RECONNECT_CLOSE_CODE, 'discard');
    } else if (this.isSocketActive(ws)) {
      ws.terminate();
    }
    this.ws = null;
    this.intentionalClose = false;
  }

  private removeReadyListener() {
    if (this.readyListener) {
      this.main.off(GatewayDispatchEvents.Ready, this.readyListener);
      this.readyListener = null;
    }
  }

  private removeResumedListener() {
    if (this.resumedListener) {
      this.main.off(GatewayDispatchEvents.Resumed, this.resumedListener);
      this.resumedListener = null;
    }
  }

  private nextBackoffMs(): number {
    if (this.reconnectAttempts === 0) {
      return 0;
    }
    const exp = Math.min(
      maxReconnectDelayMs,
      minReconnectDelayMs * 2 ** (this.reconnectAttempts - 1),
    );
    const jitter = Math.floor(Math.random() * minReconnectDelayMs);
    return Math.min(maxReconnectDelayMs, exp + jitter);
  }

  private async recover(
    reason: string,
    options: { forceIdentify?: boolean; minDelayMs?: number } = {},
  ): Promise<void> {
    if (this.destroyed || this.recovering) {
      return;
    }
    this.recovering = true;
    const forceIdentify = options.forceIdentify === true;
    let shouldRetry = false;
    try {
      const delay = Math.max(this.nextBackoffMs(), options.minDelayMs ?? 0);
      logger.warn('gateway shard recovering', {
        shard: this.shard,
        reason,
        forceIdentify,
        delayMs: delay,
        attempt: this.reconnectAttempts,
      });
      this.main.emit(GWSEvent.Debug, this.shard, 'recovering connection', {
        reason,
        forceIdentify,
        delayMs: delay,
      });
      if (delay > 0) {
        await sleep(delay);
      }
      if (this.destroyed) {
        return;
      }

      if (forceIdentify) {
        this.session_id = null;
        this.resumeGatewayUrl = null;
      }

      if (forceIdentify || !this.canResume()) {
        await this.close();
        await this.open();
      } else {
        try {
          await this.resume();
        } catch (error) {
          logger.warn('gateway shard resume failed, falling back to identify', {
            shard: this.shard,
            error,
          });
          this.main.emit(GWSEvent.Debug, this.shard, 'fail to resume', {
            error,
          });
          this.session_id = null;
          this.resumeGatewayUrl = null;
          await this.close();
          await this.open();
        }
      }
      this.reconnectAttempts = 0;
    } catch (error) {
      this.reconnectAttempts += 1;
      shouldRetry = true;
      logger.error('gateway shard recover failed', {
        shard: this.shard,
        reason,
        error,
        attempt: this.reconnectAttempts,
      });
      this.main.emit(GWSEvent.Debug, this.shard, 'recover failed', { error });
    } finally {
      this.recovering = false;
    }
    if (shouldRetry && !this.destroyed) {
      void this.recover('recover-retry', { forceIdentify: true }).catch(
        (error) => {
          logger.error('gateway shard recover retry failed', {
            shard: this.shard,
            error,
          });
        },
      );
    }
  }

  async close(options: { code?: number; reason?: string } = {}): Promise<void> {
    const { code = CLIENT_RECONNECT_CLOSE_CODE, reason = 'reconnecting' } =
      options;
    if (!this.closePromise) {
      const ws = this.ws;
      this.closePromise = getPromiseWithTimeout<void>(
        ShardSocket.maxTimeout,
        'ShardSocket.close timed out after %t ms',
        (resolve) => {
          this.main.emit(
            GWSEvent.Debug,
            this.shard,
            'client attempting to close connection',
            { code, reason },
          );

          this.clearHeartbeats();
          this.intentionalClose = true;

          if (this.isSocketActive(ws)) {
            this.detachSocketListeners(ws);
            ws.once('close', () => {
              this.main.emit(
                GWSEvent.Debug,
                this.shard,
                'client closed connection',
              );
              resolve();
            });
            ws.close(code, reason);
          } else {
            resolve();
          }
        },
      ).catch((error) => {
        logger.warn('gateway shard close timed out, terminating socket', {
          shard: this.shard,
          error,
        });
        ws?.terminate();
      });
    }

    try {
      await this.closePromise;
    } finally {
      this.ws = null;
      this.intentionalClose = false;
      this.closePromise = null;
    }
  }

  private continueHeartbeat() {
    this.heartbitTimer = setTimeout(() => {
      this.main.emit(GWSEvent.Debug, this.shard, 'emit heartbit interval');
      this.beat();
      this.continueHeartbeat();
    }, this.heartbitInterval);
  }

  private startHeartbeat() {
    if (!this.heartbitTimer) {
      const firstBitTimeOut = Math.floor(this.heartbitInterval * this.jitter);
      this.heartbitTimer = setTimeout(() => {
        this.main.emit(GWSEvent.Debug, this.shard, 'emit first heartbit');
        this.beat();
        this.continueHeartbeat();
      }, firstBitTimeOut);
    }
  }

  private hello(e: GatewayHello) {
    this.main.emit(GWSEvent.Debug, this.shard, 'recieved hello info', {
      payload: e,
    });
    this.heartbitInterval = e.d.heartbeat_interval;
  }

  async invalidSession(e: GatewayInvalidSession) {
    this.main.emit(GWSEvent.Debug, this.shard, 'receive invalid session', {
      e,
    });
    if (e.d) {
      // Discord recommends waiting 1–5s before Resume after Invalid Session.
      const delay =
        invalidSessionResumeDelayMs +
        Math.floor(Math.random() * 4 * invalidSessionResumeDelayMs);
      await sleep(delay);
      await this.recover('invalid-session-resumable');
    } else {
      this.main.emit(GWSEvent.Debug, this.shard, 'try to reconnect gateway');
      await this.recover('invalid-session-unresumable', {
        forceIdentify: true,
      });
    }
  }

  send(d: object) {
    this.ws?.send(s(d));
  }

  private beat() {
    if (!this.heartbitTimeOut) {
      this.heartbitTimeOut = setTimeout(() => {
        this.heartbitTimeOut = null;
        this.main.emit(
          GWSEvent.Debug,
          this.shard,
          'no heartbit ack event timeout',
        );
        void this.recover('heartbeat-ack-timeout').catch((error) => {
          logger.error('gateway shard heartbeat recover failed', {
            shard: this.shard,
            error,
          });
        });
      }, ShardSocket.maxTimeout);
    }
    const e = {
      op: GatewayOpcodes.Heartbeat,
      d: this.s,
    };
    this.main.emit(GWSEvent.Debug, this.shard, 'emit heartbit', { e });
    this.send(e);
  }

  private beatAck(_e: GatewayHeartbeatAck) {
    this.main.emit(GWSEvent.Debug, this.shard, 'heartbit acknowledged');
    if (this.heartbitTimeOut) {
      clearTimeout(this.heartbitTimeOut);
      this.heartbitTimeOut = null;
    }
  }

  private dispatch(e: any) {
    const { t, d } = e;
    this.main.emit(<any>t, {
      shard: this.shard,
      event: d,
    });
  }

  private async onMessage(d: WebSocket.RawData) {
    let e: any;
    try {
      e = JSON.parse(d.toString());
    } catch (error) {
      logger.warn('gateway shard received invalid JSON frame', {
        shard: this.shard,
        error,
      });
      return;
    }
    this.main.emit(GWSEvent.Debug, this.shard, 'ShardSocket.dispatch', { e });
    if (e && !!e.s) {
      this.s = e.s;
    }
    switch (e.op) {
      case GatewayOpcodes.Dispatch:
        this.dispatch(e);
        break;
      case GatewayOpcodes.HeartbeatAck:
        this.beatAck(<any>e);
        break;
      case GatewayOpcodes.Hello:
        this.hello(<any>e);
        break;
      case GatewayOpcodes.Heartbeat:
        this.main.emit(GWSEvent.Debug, this.shard, 'emit heartbit response');
        this.beat();
        break;
      case GatewayOpcodes.Reconnect:
        this.main.emit(GWSEvent.Debug, this.shard, 'recieved reconnect');
        await this.recover('opcode-reconnect');
        break;
      case GatewayOpcodes.InvalidSession:
        await this.invalidSession(<any>e);
        break;
      default:
        break;
    }

    this.startHeartbeat();
  }

  private handleServerClose(code: number, reason: string) {
    this.clearHeartbeats();
    this.detachSocketListeners(this.ws);
    this.ws = null;

    const codeString = getStatusCodeString(code);
    logger.warn('gateway shard server closed connection', {
      shard: this.shard,
      code,
      codeString,
      reason,
    });
    this.main.emit(GWSEvent.Debug, this.shard, 'server closed connection', {
      code,
      codeString,
      reason,
    });

    if (this.intentionalClose || this.destroyed) {
      this.intentionalClose = false;
      return;
    }

    const action = classifyCloseCode(code);
    if (action === 'fatal') {
      logger.error('gateway shard fatal close, not reconnecting', {
        shard: this.shard,
        code,
        codeString,
        reason,
      });
      this.destroyed = true;
      return;
    }

    const forceIdentify = action === 'identify';
    const minDelayMs = SLOW_RECONNECT_CLOSE_CODES.has(code)
      ? RATE_LIMITED_MIN_DELAY_MS
      : 0;
    void this.recover(`server-close-${code}`, {
      forceIdentify,
      minDelayMs,
    }).catch((error) => {
      logger.error('gateway shard close recover failed', {
        shard: this.shard,
        code,
        error,
      });
    });
  }

  private configureSocket(ws: WebSocket) {
    ws.on('message', (data: WebSocket.RawData) => {
      void this.onMessage(data).catch((error) => {
        logger.error('gateway shard onMessage failed', {
          shard: this.shard,
          error,
        });
        void this.recover('onmessage-error').catch((recoverError) => {
          logger.error('gateway shard onMessage recover failed', {
            shard: this.shard,
            error: recoverError,
          });
        });
      });
    });
    ws.once('close', (code: WsClosedCode, reason: Buffer) => {
      this.handleServerClose(code, reason.toString());
    });
    ws.on('error', (e) => {
      logger.warn('gateway shard websocket error', {
        shard: this.shard,
        error: e,
      });
      this.main.emit(GWSEvent.Debug, this.shard, 'recieved error', e);
    });
  }

  private async resume() {
    if (!this.canResume()) {
      throw new Error('ShardSocket.resume requires session_id and resume URL');
    }

    if (!this.resumePromise) {
      this.resumePromise = getPromiseWithTimeout<void>(
        this.maxTimeout,
        'ShardSocket.resume timed out after %t ms',
        async (resolve, reject) => {
          if (this.ws) {
            this.main.emit(GWSEvent.Debug, this.shard, 'close connection');
            await this.close();
          }
          this.main.emit(
            GWSEvent.Debug,
            this.shard,
            'try to resume connection',
          );
          const ws = new WebSocket(
            `${this.resumeGatewayUrl}?v=${apiVersion}&encoding=${encoding}`,
          );

          this.removeResumedListener();
          this.resumedListener = () => {
            this.main.emit(
              GWSEvent.Debug,
              this.shard,
              'recieved resumed packet',
            );
            this.removeResumedListener();
            resolve(undefined);
          };
          this.main.once(GatewayDispatchEvents.Resumed, this.resumedListener);

          ws.once('open', () => {
            this.main.emit(GWSEvent.Debug, this.shard, 'resumed connection');
            setTimeout(() => {
              this.main.emit(GWSEvent.Debug, this.shard, 'send resume packet');
              this.send({
                op: GatewayOpcodes.Resume,
                d: {
                  token: this.main.token,
                  session_id: this.session_id,
                  seq: this.s,
                },
              });
            }, onConnectionDelay);
          });

          ws.once('error', (error) => {
            this.removeResumedListener();
            reject(error);
          });

          this.configureSocket(ws);
          this.ws = ws;
        },
      ).catch((error) => {
        this.removeResumedListener();
        this.discardSocket();
        throw error;
      });
    }

    try {
      await this.resumePromise;
    } finally {
      this.resumePromise = null;
    }
  }

  async open(): Promise<void> {
    if (this.destroyed) {
      return Promise.reject(
        new Error('destroyed ShardSocket should be removed'),
      );
    }

    if (!this.openPromise) {
      this.openPromise = getPromiseWithTimeout<void>(
        this.maxTimeout,
        'ShardSocket.open timed out after %t ms',
        (resolve, reject) => {
          this.main.emit(GWSEvent.Debug, this.shard, 'starting connection');

          const ws = new WebSocket(
            `${this.main.url}?v=${apiVersion}&encoding=${encoding}`,
          );

          ws.once('open', () => {
            this.main.emit(GWSEvent.Debug, this.shard, 'opened connection');
            setTimeout(() => {
              this.main.emit(
                GWSEvent.Debug,
                this.shard,
                'send identify packet',
              );
              this.send({
                op: GatewayOpcodes.Identify,
                d: {
                  token: this.main.token,
                  shard: [this.shard, this.main.shards],
                  compress: false,
                  large_threshold: 250,
                  presence: {},
                  properties: {
                    os: 'linux',
                    browser: 'PtitPote',
                    device: 'PtitPote',
                  },
                  intents:
                    GatewayIntentBits.Guilds |
                    GatewayIntentBits.GuildMessageReactions |
                    GatewayIntentBits.GuildMessages |
                    GatewayIntentBits.DirectMessages,
                },
              });
            }, onConnectionDelay);
          });

          ws.once('error', (error) => {
            this.removeReadyListener();
            reject(error);
          });

          this.configureSocket(ws);

          this.ws = ws;

          this.removeReadyListener();
          this.readyListener = ({ event }) => {
            this.main.emit(GWSEvent.Debug, this.shard, 'recieved ready info');
            this.session_id = event.session_id;
            this.resumeGatewayUrl = event.resume_gateway_url;
            this.removeReadyListener();
            resolve(undefined);
          };
          this.main.once(GatewayDispatchEvents.Ready, this.readyListener);
        },
      ).catch((error) => {
        this.removeReadyListener();
        this.discardSocket();
        throw error;
      });
    }

    try {
      await this.openPromise;
    } finally {
      this.openPromise = null;
    }
  }

  destroy(): Promise<void> {
    this.main.emit(GWSEvent.Debug, this.shard, 'destroy');
    this.destroyed = true;
    this.removeReadyListener();
    this.removeResumedListener();
    return this.close({
      code: CLIENT_SHUTDOWN_CLOSE_CODE,
      reason: 'shutdown',
    });
  }
}
