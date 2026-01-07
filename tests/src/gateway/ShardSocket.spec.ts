import { ShardSocket } from "../../../src/gateway/ShardSocket.js";
import { GatewaySocket } from "../../../src/gateway/GatewaySocket.js";
import {
  heartbeatAckMsg,
  helloMsg,
  invalidSessionMsg,
  readyMsg,
  reconnectMsg,
  resumedMsg,
} from "../../mocks/discordGatewayMsg.js";
import {
  GatewayDispatchEvents,
  GatewayIntentBits,
  GatewayOpcodes,
  GatewayReadyDispatch,
} from "discord.js";
import { WebSocketServerMock } from "../../mocks/WebSocketMock.js";
import { WsClosedCode, GWSEvent } from "../../../src/gateway/gatewaytypes.js";

const s = JSON.stringify;
const p = JSON.parse;

const encoding = "json";
const apiVersion = "10";

const fakeLatency = async (min: number, max: number) => {
  const latency = Math.random() * (max - min) + min;
  await vi.advanceTimersByTimeAsync(latency);
};

const intents =
  GatewayIntentBits.GuildMessageReactions |
  GatewayIntentBits.GuildMessages |
  GatewayIntentBits.DirectMessages;

describe("ShardSocket", () => {
  let shardSocket: ShardSocket;
  let gateway: GatewaySocket;
  let server: WebSocketServerMock;
  beforeEach(() => {
    vi.useFakeTimers();
    server = WebSocketServerMock.createInstance();
    gateway = new GatewaySocket("fakeToken");
    vi.spyOn(gateway, "url", "get").mockReturnValue(server.getUrl());
    shardSocket = new ShardSocket(gateway, 0);
  });
  afterEach(() => {
    vi.clearAllTimers();
  });

  it("should open connection on Discord Gateway API version 10 using json encoding", async () => {
    const wsCoSpy = vi.fn();
    server.on("wsconnection", wsCoSpy);

    shardSocket.open().catch(() => {});

    await vi.advanceTimersByTimeAsync(100);

    expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
      shardSocket.ws,
      `${server.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
    );
  });

  it("should reject with timeout (ShardSocket.maxTimeout) when Discord does not send a welcome message", async () => {
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

  it("should send identify with intents", async () => {
    shardSocket.open().catch(() => {});
    await vi.advanceTimersByTimeAsync(100);
    server.send(s(helloMsg({})));
    await vi.advanceTimersByTimeAsync(100);

    const identityPayload = {
      op: GatewayOpcodes.Identify,
      d: {
        token: gateway.token,
        shard: [0, gateway.shards],
        compress: false,
        large_threshold: 250,
        presence: {},
        properties: {
          os: "linux",
          browser: "PtitPote",
          device: "PtitPote",
        },
        intents:
          GatewayIntentBits.GuildMessageReactions |
          GatewayIntentBits.GuildMessages |
          GatewayIntentBits.DirectMessages,
      },
    };
    expect(server.getSpy()).toBeCalledWith(s(identityPayload));
  });

  describe("connection continuity mechanism", () => {
    let resumeServer: WebSocketServerMock;
    let readyPayload: GatewayReadyDispatch;
    beforeEach(async () => {
      await vi.advanceTimersByTimeAsync(50);
      resumeServer = WebSocketServerMock.createInstance();

      resumeServer.on("wsmessage", async (d) => {
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
        "websocket connection close with abnormal closure",
        async () => {
          await fakeLatency(20, 50);
          server.emit("close", WsClosedCode.AbnormalClosure, Buffer.from(""));
        },
      ],
      [
        "discord send reconnect event",
        async () => {
          await fakeLatency(20, 50);
          server.send(s(reconnectMsg()));
        },
      ],
      [
        "discord send invalid session event with resumable connection",
        async () => {
          await fakeLatency(20, 50);
          server.send(s(invalidSessionMsg(true)));
        },
      ],
      [
        "when app doesn't receive a heartbeat ACK in time",
        async () => {
          let nbOfHbAckSended = 0;
          server.on("wsmessage", async (d) => {
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
    ])("when %s", (_s: string, prepare: () => Promise<void>) => {
      beforeEach(async () => {
        await prepare();
      });

      it(`should open new connection on resume server version ${apiVersion} using ${encoding} as encoding`, async () => {
        const wsCoSpy = vi.fn();
        resumeServer.on("wsconnection", wsCoSpy);

        await vi.advanceTimersByTimeAsync(1000000);

        expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
          shardSocket.ws,
          `${resumeServer.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
        );
      });

      it("should send resume event to replay missed events when a disconnected client resumes", async () => {
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

    describe("when discord send invalid session event with unresumable connection", () => {
      beforeEach(async () => {
        await fakeLatency(20, 50);
        server.send(s(invalidSessionMsg(false)));
      });

      it(`should open new connection on initial gateway server version ${apiVersion} using ${encoding} as encoding`, async () => {
        const wsCoSpy = vi.fn();
        server.on("wsconnection", wsCoSpy);

        await vi.advanceTimersByTimeAsync(200);

        expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
          shardSocket.ws,
          `${server.getUrl()}?v=${apiVersion}&encoding=${encoding}`,
        );
      });

      it("should send identify with intents", async () => {
        await vi.advanceTimersByTimeAsync(100);
        const identityPayload = {
          op: GatewayOpcodes.Identify,
          d: {
            token: gateway.token,
            shard: [0, gateway.shards],
            compress: false,
            large_threshold: 250,
            presence: {},
            properties: {
              os: "linux",
              browser: "PtitPote",
              device: "PtitPote",
            },
            intents:
              GatewayIntentBits.GuildMessageReactions |
              GatewayIntentBits.GuildMessages |
              GatewayIntentBits.DirectMessages,
          },
        };
        expect(server.getSpy()).toBeCalledWith(s(identityPayload));
      });
    });
  });

  describe("heartbit mechanism", () => {
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

    it("should start heartbit mechanism using jitter method", async () => {
      const currentTime = Date.now();
      const times: number[] = [];
      server.on("wsmessage", async (d) => {
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

    it("should keep heartbit interval using hello reponse interval", async () => {
      shardSocket.jitter = 1 / 10000; // force jitter cause random is painfull to test
      server.on("wsmessage", async (d) => {
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
    "should emit gateway event on dispatch %s message",
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

      const expectedEvent = { aPayload: "expected" };

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
