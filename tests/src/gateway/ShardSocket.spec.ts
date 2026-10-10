import { ShardSocket } from '../../../src/gateway/ShardSocket.js';
import { GatewaySocket } from '../../../src/gateway/GatewaySocket.js';
import {
  heartbeatAckMsg,
  helloMsg,
  invalidSessionMsg,
  readyMsg,
  reconnectMsg,
  resumedMsg,
} from '../../mocks/discordGatewayMsg.js';
import {
  GatewayDispatchEvents,
  GatewayIntentBits,
  GatewayOpcodes,
  GatewayReadyDispatch,
} from 'discord-api-types/v10';
import { WebSocketServerMock } from '../../mocks/WebSocketMock.js';
import { logger } from '../../../src/logger.js';
import { GatewayClosedError } from '../../../src/gateway/errors.js';
import { WsClosedCode, GWSEvent } from '../../../src/gateway/gatewaytypes.js';
import {
  CLIENT_RECONNECT_CLOSE_CODE,
  CLIENT_SHUTDOWN_CLOSE_CODE,
  FATAL_GATEWAY_CLOSE_CODES,
  RATE_LIMITED_MIN_DELAY_MS,
} from '../../../src/gateway/closeCodes.js';

const s = JSON.stringify;
const p = JSON.parse;

const encoding = 'json';
const apiVersion = '10';

const fakeLatency = async (min: number, max: number) => {
  const latency = Math.random() * (max - min) + min;
  await vi.advanceTimersByTimeAsync(latency);
};

const intents =
  GatewayIntentBits.Guilds |
  GatewayIntentBits.GuildMessageReactions |
  GatewayIntentBits.GuildMessages |
  GatewayIntentBits.DirectMessages;

const identify = (shards: number | null = null, presence: object = {}) => ({
  op: GatewayOpcodes.Identify,
  d: {
    token: 'fakeToken',
    shard: [0, shards],
    compress: false,
    large_threshold: 250,
    presence,
    properties: {
      os: 'linux',
      browser: 'PtitPote',
      device: 'PtitPote',
    },
    intents,
  },
});

describe('ShardSocket', () => {
  let shardSocket: ShardSocket;
  let gateway: GatewaySocket;
  let server: WebSocketServerMock;
  beforeEach(() => {
    vi.useFakeTimers();
    server = WebSocketServerMock.createInstance();
    gateway = new GatewaySocket('fakeToken');
    vi.spyOn(gateway, 'url', 'get').mockReturnValue(server.getUrl());
    shardSocket = new ShardSocket(gateway, 0);
  });
  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should open connection on Discord Gateway API version 10 using json encoding', async () => {
    const wsCoSpy = vi.fn();
    server.on('wsconnection', wsCoSpy);

    shardSocket.open().catch(() => {});

    await vi.advanceTimersByTimeAsync(100);

    expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
      shardSocket.ws,
      `${server.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
    );
  });

  it('should reject with timeout (ShardSocket.maxTimeout) when Discord does not send a welcome message', async () => {
    const helloDelay = 100;
    const openPromise = shardSocket.open();
    vi.advanceTimersByTime(helloDelay);
    server.send(s(helloMsg({})));
    await vi.advanceTimersByTime(ShardSocket.maxTimeout - helloDelay);

    server.send(s(readyMsg({}))); // to late
    await expect(openPromise).rejects.toThrow(
      Error(`ShardSocket.open timed out after ${ShardSocket.maxTimeout} ms`),
    );
  });

  it('should not leak the ready listener when open times out', async () => {
    const openPromise = shardSocket.open();
    const assertion = expect(openPromise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(ShardSocket.maxTimeout + 100);
    await assertion;

    expect(gateway.listenerCount(GatewayDispatchEvents.Ready)).toBe(0);
  });

  it('should reject open right away when the server closes the connection', async () => {
    const openPromise = shardSocket.open();
    const assertion =
      expect(openPromise).rejects.toBeInstanceOf(GatewayClosedError);
    await vi.advanceTimersByTimeAsync(100);
    server.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));
    await vi.advanceTimersByTimeAsync(10);

    await assertion;
    expect(gateway.listenerCount(GatewayDispatchEvents.Ready)).toBe(0);
  });

  it('should send the configured presence with identify', async () => {
    const presence = { status: 'online', afk: false, since: null };
    gateway.presence = presence as any;
    shardSocket.open().catch(() => {});
    await vi.advanceTimersByTimeAsync(100);

    expect(server.getSpy()).toBeCalledWith(s(identify(null, presence)));
  });

  it('should send identify with intents', async () => {
    shardSocket.open().catch(() => {});
    await vi.advanceTimersByTimeAsync(100);
    server.send(s(helloMsg({})));
    await vi.advanceTimersByTimeAsync(100);

    const identityPayload = identify();
    expect(server.getSpy()).toBeCalledWith(s(identityPayload));
  });

  describe('connection continuity mechanism', () => {
    let resumeServer: WebSocketServerMock;
    let readyPayload: GatewayReadyDispatch;
    beforeEach(async () => {
      await vi.advanceTimersByTimeAsync(50);
      resumeServer = WebSocketServerMock.createInstance();

      resumeServer.on('wsmessage', async (d) => {
        const m = p(d);
        await fakeLatency(20, 50);
        if (m.op === GatewayOpcodes.Heartbeat) {
          resumeServer.send(s(heartbeatAckMsg()));
        }
        if (m.op === GatewayOpcodes.Resume) {
          resumeServer.send(s(resumedMsg()));
        }
      });

      readyPayload = readyMsg({
        resume_gateway_url: resumeServer.getUrl(),
      });

      shardSocket.open();

      await fakeLatency(20, 50);
      server.send(s(helloMsg({})));

      await fakeLatency(20, 50);
      server.send(s(readyPayload));

      await fakeLatency(20, 50);
      server.getSpy().mockClear();
    });

    describe.each([
      [
        'websocket connection close with abnormal closure',
        async () => {
          await fakeLatency(20, 50);
          server.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));
        },
      ],
      [
        'discord send reconnect event',
        async () => {
          await fakeLatency(20, 50);
          server.send(s(reconnectMsg()));
        },
      ],
      [
        'discord send invalid session event with resumable connection',
        async () => {
          await fakeLatency(20, 50);
          server.send(s(invalidSessionMsg(true)));
        },
      ],
      [
        "when app doesn't receive a heartbeat ACK in time",
        async () => {
          let nbOfHbAckSended = 0;
          server.on('wsmessage', async (d) => {
            const m = p(d);
            await fakeLatency(30, 50);
            if (m.op === GatewayOpcodes.Heartbeat) {
              if (nbOfHbAckSended < 3) {
                server.send(s(heartbeatAckMsg()));
                nbOfHbAckSended++;
              }
            }
          });
        },
      ],
    ])('when %s', (_s: string, prepare: () => Promise<void>) => {
      beforeEach(async () => {
        await prepare();
      });

      it(`should open new connection on resume server version ${apiVersion} using ${encoding} as encoding`, async () => {
        const wsCoSpy = vi.fn();
        resumeServer.on('wsconnection', wsCoSpy);

        await vi.advanceTimersByTimeAsync(1000000);

        expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
          shardSocket.ws,
          `${resumeServer.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
        );
      });

      it('should send resume event to replay missed events when a disconnected client resumes', async () => {
        const serverSp = resumeServer.getSpy();

        await vi.advanceTimersByTimeAsync(1000000);

        expect(serverSp).toHaveBeenCalledWith(
          s({
            op: GatewayOpcodes.Resume,
            d: {
              token: gateway.token,
              session_id: readyPayload.d.session_id,
              seq: 1,
            },
          }),
        );
      });
    });

    describe('when discord send invalid session event with unresumable connection', () => {
      beforeEach(async () => {
        await fakeLatency(20, 50);
        server.send(s(invalidSessionMsg(false)));
      });

      it(`should open new connection on initial gateway server version ${apiVersion} using ${encoding} as encoding`, async () => {
        const wsCoSpy = vi.fn();
        server.on('wsconnection', wsCoSpy);

        await vi.advanceTimersByTimeAsync(200);

        expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
          shardSocket.ws,
          `${server.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
        );
      });

      it('should send identify with intents', async () => {
        await vi.advanceTimersByTimeAsync(100);
        const identityPayload = identify();
        expect(server.getSpy()).toBeCalledWith(s(identityPayload));
      });
    });

    describe.each([
      ['normal closure', WsClosedCode.NormalClosure],
      ['going away', WsClosedCode.GoingAway],
    ])('when websocket closes with %s', (_label, code) => {
      it('should resume on the resume gateway', async () => {
        const wsCoSpy = vi.fn();
        resumeServer.on('wsconnection', wsCoSpy);

        await fakeLatency(20, 50);
        server.emit('close', code, Buffer.from(''));

        await vi.advanceTimersByTimeAsync(1000000);

        expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
          shardSocket.ws,
          `${resumeServer.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
        );
      });
    });

    it.each([
      ['session timed out', WsClosedCode.SessionTimedOut],
      ['invalid seq', WsClosedCode.InvalidSeq],
    ])('should re-identify when websocket closes with %s', async (_l, code) => {
      const wsCoSpy = vi.fn();
      server.on('wsconnection', wsCoSpy);

      await fakeLatency(20, 50);
      server.emit('close', code, Buffer.from(''));

      await vi.advanceTimersByTimeAsync(500);

      expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
        shardSocket.ws,
        `${server.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
      );
      expect(server.getSpy()).toHaveBeenCalledWith(s(identify()));
    });

    it.each([...FATAL_GATEWAY_CLOSE_CODES])(
      'should not reconnect on fatal close code %i',
      async (code) => {
        const resumeSpy = vi.fn();
        const openSpy = vi.fn();
        resumeServer.on('wsconnection', resumeSpy);
        server.on('wsconnection', openSpy);

        await fakeLatency(20, 50);
        server.emit('close', code, Buffer.from('fatal'));

        await vi.advanceTimersByTimeAsync(1000000);

        expect(resumeSpy).not.toHaveBeenCalled();
        expect(openSpy).not.toHaveBeenCalled();
        expect(shardSocket.destroyed).toBe(true);
      },
    );

    it('should wait before reconnecting when rate limited by discord', async () => {
      const wsCoSpy = vi.fn();
      resumeServer.on('wsconnection', wsCoSpy);

      await fakeLatency(20, 50);
      server.emit('close', WsClosedCode.RateLimited, Buffer.from(''));

      await vi.advanceTimersByTimeAsync(RATE_LIMITED_MIN_DELAY_MS - 100);
      expect(wsCoSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      expect(wsCoSpy).toHaveBeenCalledOnce();
    });

    describe.each([
      [
        'discord send reconnect event',
        async () => {
          await fakeLatency(20, 50);
          server.send(s(reconnectMsg()));
        },
      ],
      [
        'discord send invalid session event with resumable connection',
        async () => {
          await fakeLatency(20, 50);
          server.send(s(invalidSessionMsg(true)));
        },
      ],
      [
        'heartbeat ack is missing',
        async () => {
          shardSocket.heartbitInterval = 1000;
          shardSocket.jitter = 0;
          server.on('wsmessage', () => {});
          await vi.advanceTimersByTimeAsync(100);
          server.send(s(helloMsg({ heartbeat_interval: 1000 })));
        },
      ],
    ])('when %s', (_label, trigger) => {
      it('should close the old connection with an application code to keep the session resumable', async () => {
        const closeSpy = vi.fn();
        server.on('wsclose', closeSpy);

        await trigger();
        await vi.advanceTimersByTimeAsync(60000);

        expect(closeSpy).toHaveBeenCalled();
        for (const [code] of closeSpy.mock.calls) {
          expect([
            WsClosedCode.NormalClosure,
            WsClosedCode.GoingAway,
          ]).not.toContain(code);
        }
        expect(closeSpy.mock.calls[0][0]).toBe(CLIENT_RECONNECT_CLOSE_CODE);
      });
    });

    it('should close with a normal closure when destroyed', async () => {
      const closeSpy = vi.fn();
      server.on('wsclose', closeSpy);

      await shardSocket.destroy();

      expect(closeSpy).toHaveBeenCalledWith(
        CLIENT_SHUTDOWN_CLOSE_CODE,
        expect.any(String),
      );
    });

    it('should back off when the connection drops again before being stable', async () => {
      const wsCoSpy = vi.fn();
      resumeServer.on('wsconnection', wsCoSpy);

      await fakeLatency(20, 50);
      server.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));
      await vi.advanceTimersByTimeAsync(500);
      expect(wsCoSpy).toHaveBeenCalledTimes(1);

      resumeServer.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));
      await vi.advanceTimersByTimeAsync(500);
      expect(wsCoSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2500);
      expect(wsCoSpy).toHaveBeenCalledTimes(2);
    });

    it('should reconnect immediately again once the connection was stable', async () => {
      const wsCoSpy = vi.fn();
      resumeServer.on('wsconnection', wsCoSpy);

      await fakeLatency(20, 50);
      server.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));
      await vi.advanceTimersByTimeAsync(61_000);
      expect(wsCoSpy).toHaveBeenCalledTimes(1);

      resumeServer.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));
      await vi.advanceTimersByTimeAsync(500);
      expect(wsCoSpy).toHaveBeenCalledTimes(2);
    });

    it('should record every identify in the identify limiter', async () => {
      expect(gateway.identifyLimiter.count()).toBe(1);

      server.send(s(invalidSessionMsg(false)));
      await vi.advanceTimersByTimeAsync(500);

      expect(gateway.identifyLimiter.count()).toBe(2);
    });

    it('should delay identify when the identify budget is exhausted', async () => {
      vi.spyOn(gateway.identifyLimiter, 'msUntilAvailable').mockReturnValue(
        10_000,
      );
      const wsCoSpy = vi.fn();
      server.on('wsconnection', wsCoSpy);

      server.send(s(invalidSessionMsg(false)));
      await vi.advanceTimersByTimeAsync(5000);
      expect(wsCoSpy).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'gateway identify budget exhausted, delaying identify',
        expect.objectContaining({ delayMs: 10_000 }),
      );

      await vi.advanceTimersByTimeAsync(6000);
      expect(wsCoSpy).toHaveBeenCalledOnce();
    });

    it('should reset the sequence number when a new session is identified', async () => {
      expect(shardSocket.s).toBe(1);

      server.send(s(invalidSessionMsg(false)));
      await vi.advanceTimersByTimeAsync(500);

      expect(shardSocket.s).toBeNull();
    });

    it('should keep trying to resume before falling back to identify when resume times out', async () => {
      const deadServer = WebSocketServerMock.createInstance();
      shardSocket.resumeGatewayUrl = deadServer.getUrl();
      const deadSpy = vi.fn();
      const identifySpy = vi.fn();
      deadServer.on('wsconnection', deadSpy);
      server.on('wsconnection', identifySpy);

      server.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));

      await vi.advanceTimersByTimeAsync(ShardSocket.maxTimeout + 500);
      expect(deadSpy).toHaveBeenCalledTimes(1);
      expect(identifySpy).not.toHaveBeenCalled();
      expect(shardSocket.session_id).not.toBeNull();

      await vi.advanceTimersByTimeAsync(45_000);
      expect(deadSpy).toHaveBeenCalledTimes(3);
      expect(identifySpy).toHaveBeenCalled();
    });

    it('should clear heartbeat timers on server close', async () => {
      shardSocket.heartbitInterval = 1000;
      // Force a pending heartbeat interval timer
      (shardSocket as any).continueHeartbeat();
      expect(shardSocket.heartbitTimer).not.toBeNull();

      await fakeLatency(20, 50);
      server.emit('close', WsClosedCode.NormalClosure, Buffer.from(''));
      await vi.advanceTimersByTimeAsync(0);

      expect(shardSocket.heartbitTimer).toBeNull();
      expect(shardSocket.heartbitTimeOut).toBeNull();
    });

    it('should fall back to identify when resume gateway URL is missing', async () => {
      const wsCoSpy = vi.fn();
      server.on('wsconnection', wsCoSpy);
      shardSocket.resumeGatewayUrl = null;

      await fakeLatency(20, 50);
      server.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));

      await vi.advanceTimersByTimeAsync(500);

      expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
        shardSocket.ws,
        `${server.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
      );
    });

    describe('when the resume attempt fails', () => {
      let brokenServer: WebSocketServerMock;
      let brokenSpy: ReturnType<typeof vi.fn>;
      let identifySpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        brokenServer = WebSocketServerMock.createInstance();
        brokenSpy = vi.fn();
        identifySpy = vi.fn();
        brokenServer.on('wsconnection', brokenSpy);
        server.on('wsconnection', identifySpy);
        shardSocket.resumeGatewayUrl = brokenServer.getUrl();
      });

      it.each([
        [
          'an unresumable invalid session',
          () => brokenServer.send(s(invalidSessionMsg(false))),
        ],
        [
          'a session timed out close',
          () =>
            brokenServer.emit(
              'close',
              WsClosedCode.SessionTimedOut,
              Buffer.from(''),
            ),
        ],
        [
          'an invalid seq close',
          () =>
            brokenServer.emit(
              'close',
              WsClosedCode.InvalidSeq,
              Buffer.from(''),
            ),
        ],
      ])(
        'should identify right away on %s without waiting for the timeout',
        async (_label, answer) => {
          brokenServer.on('wsmessage', (d) => {
            if (p(d).op === GatewayOpcodes.Resume) {
              answer();
            }
          });

          server.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));
          await vi.advanceTimersByTimeAsync(1000);

          expect(brokenSpy).toHaveBeenCalledOnce();
          expect(identifySpy).toHaveBeenCalledOnce();
          expect(ShardSocket.maxTimeout).toBeGreaterThan(1000);
        },
      );

      it('should retry resume without waiting for the timeout when the connection drops', async () => {
        brokenServer.on('wsmessage', (d) => {
          if (p(d).op === GatewayOpcodes.Resume) {
            brokenServer.emit(
              'close',
              WsClosedCode.AbnormalClosure,
              Buffer.from(''),
            );
          }
        });

        server.emit('close', WsClosedCode.AbnormalClosure, Buffer.from(''));
        await vi.advanceTimersByTimeAsync(3500);

        expect(brokenSpy).toHaveBeenCalledTimes(2);
        expect(identifySpy).not.toHaveBeenCalled();
        expect(shardSocket.session_id).not.toBeNull();
      });
    });

    it('should not recover after an invalid session wait when destroyed meanwhile', async () => {
      const wsCoSpy = vi.fn();
      resumeServer.on('wsconnection', wsCoSpy);

      server.send(s(invalidSessionMsg(true)));
      await vi.advanceTimersByTimeAsync(100);
      await shardSocket.destroy();
      await vi.advanceTimersByTimeAsync(20_000);

      expect(wsCoSpy).not.toHaveBeenCalled();
    });

    it('should keep the connection when an event listener throws', async () => {
      const wsCoSpy = vi.fn();
      const otherListener = vi.fn();
      resumeServer.on('wsconnection', wsCoSpy);
      server.on('wsconnection', wsCoSpy);
      gateway.on(GatewayDispatchEvents.MessageCreate, () => {
        throw new Error('listener failure');
      });
      gateway.on(GatewayDispatchEvents.MessageCreate, otherListener);

      server.send(
        s({
          t: GatewayDispatchEvents.MessageCreate,
          s: 2,
          op: GatewayOpcodes.Dispatch,
          d: { content: 'hello' },
        }),
      );
      await vi.advanceTimersByTimeAsync(5000);

      expect(otherListener).toHaveBeenCalledOnce();
      expect(wsCoSpy).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'gateway event listener failed',
        expect.objectContaining({
          eventName: GatewayDispatchEvents.MessageCreate,
        }),
      );
    });

    it.each([
      ['invalid json', 'not json', 'gateway shard received invalid JSON frame'],
      ['a null frame', 'null', 'gateway shard received unexpected frame'],
    ])(
      'should ignore %s frames without reconnecting',
      async (_l, frame, log) => {
        const wsCoSpy = vi.fn();
        resumeServer.on('wsconnection', wsCoSpy);
        server.on('wsconnection', wsCoSpy);

        server.send(frame);
        await vi.advanceTimersByTimeAsync(5000);

        expect(logger.warn).toHaveBeenCalledWith(log, expect.anything());
        expect(wsCoSpy).not.toHaveBeenCalled();
      },
    );

    it('should not send on a socket that is not open', async () => {
      server.getSpy().mockClear();
      shardSocket.ws!.readyState = 3;

      shardSocket.send({ op: GatewayOpcodes.Heartbeat, d: null });

      expect(server.getSpy()).not.toHaveBeenCalled();
    });
  });

  describe('heartbit mechanism', () => {
    const heartbeat_interval = 7500;
    let resumeServer: WebSocketServerMock;
    let readyPayload: GatewayReadyDispatch;
    beforeEach(async () => {
      resumeServer = WebSocketServerMock.createInstance();
      readyPayload = readyMsg({
        resume_gateway_url: resumeServer.getUrl(),
      });

      shardSocket.open();

      await fakeLatency(20, 50);
      server.send(
        s(
          helloMsg({
            heartbeat_interval,
          }),
        ),
      );
      await fakeLatency(20, 50);
      server.send(s(readyPayload));
      server.getSpy().mockClear();
    });

    it('should start heartbit mechanism using jitter method', async () => {
      const currentTime = Date.now();
      const times: number[] = [];
      server.on('wsmessage', async (d) => {
        const m = p(d);
        if (m.op === GatewayOpcodes.Heartbeat) {
          times.push(Date.now() - currentTime);
          await fakeLatency(20, 50);
          server.send(s(heartbeatAckMsg()));
        }
      });

      await vi.advanceTimersByTimeAsync(heartbeat_interval * 10);

      expect(times[0]).toBeWithin(0, heartbeat_interval);
      expect(times[1] - times[0]).toEqual(heartbeat_interval);
      expect(times[2] - times[1]).toEqual(heartbeat_interval);
      expect(times[3] - times[2]).toEqual(heartbeat_interval);
    });

    it('should keep heartbit interval using hello reponse interval', async () => {
      shardSocket.jitter = 1 / 10000; // force jitter cause random is painfull to test
      server.on('wsmessage', async (d) => {
        const m = p(d);
        if (m.op === GatewayOpcodes.Heartbeat) {
          await fakeLatency(20, 50);
          server.send(s(heartbeatAckMsg()));
        }
      });

      const expectedBeats = [];
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(heartbeat_interval);
        expectedBeats.push([s({ op: GatewayOpcodes.Heartbeat, d: 1 })]);
      }
      expect(server.getSpy().mock.calls).toEqual(expectedBeats);
    });
  });

  it.each(Object.keys(GatewayDispatchEvents))(
    'should emit gateway event on dispatch %s message',
    async (e: unknown) => {
      shardSocket.open().catch(() => {});
      await vi.advanceTimersByTimeAsync(100);
      server.send(s(helloMsg({})));
      await vi.advanceTimersByTimeAsync(100);

      const spy = vi.fn();
      const event = <GatewayDispatchEvents>(
        GatewayDispatchEvents[<keyof typeof GatewayDispatchEvents>e]
      );
      gateway.on(event, spy);

      const expectedEvent = { aPayload: 'expected' };

      server.send(
        s({
          t: event,
          s: 1,
          op: GatewayOpcodes.Dispatch,
          d: expectedEvent,
        }),
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(spy).toHaveBeenCalledExactlyOnceWith({
        event: expectedEvent,
        shard: 0,
      });
    },
  );
});
