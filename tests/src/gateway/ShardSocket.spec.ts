import { ShardSocket } from "../../../src/gateway/ShardSocket.js";
import { GatewaySocket } from "../../../src/gateway/GatewaySocket.js";
import {
  heartbeatAckMsg,
  helloMsg,
  readyMsg,
} from "../../mocks/discordGatewayMsg.js";
import {
  GatewayIntentBits,
  GatewayOpcodes,
  GatewayReadyDispatch,
} from "discord.js";
import { WebSocketServerMock } from "../../mocks/WebSocketMock.js";
import { WsClosedCode, GWSEvent } from "../../../src/gateway/gatewaytypes.js";
const s = JSON.stringify;

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

  describe("open", () => {
    it("should open new connection on Discord Gateway API version 10 using json encoding", async () => {
      const wsCoSpy = vi.fn();
      server.on("wsconnection", wsCoSpy);

      shardSocket.open().catch(() => {});

      await vi.advanceTimersByTimeAsync(100);

      expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
        shardSocket.ws,
        `${server.getUrl()}?v=10&encoding=json`,
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

    it("should resolve connection if server send welcome message earlier than timeout", async () => {
      const openPromise = shardSocket.open();

      await vi.advanceTimersByTimeAsync(100);
      server.send(s(helloMsg({})));
      await vi.advanceTimersByTimeAsync(100);
      server.send(s(readyMsg({})));

      await vi.advanceTimersByTimeAsync(ShardSocket.maxTimeout);

      const result = await openPromise;

      expect(result).toStrictEqual({
        timeReady: expect.any(Number),
        socket: shardSocket,
      });
    });

    it("should request the first heartbeat using jitter method", async () => {
      const heartbeat_interval = 5000;
      const fakejitter = Math.random();

      vi.spyOn(shardSocket, "jitter", "get").mockReturnValue(fakejitter);

      shardSocket.open();

      await vi.advanceTimersByTimeAsync(100);
      server.send(
        s(
          helloMsg({
            heartbeat_interval,
          }),
        ),
      );
      await vi.advanceTimersByTimeAsync(100);
      server.send(s(readyMsg({})));
      server.getSpy().mockClear();

      await vi.advanceTimersByTimeAsync(heartbeat_interval * fakejitter - 102);

      expect(server.getSpy()).toHaveBeenCalledTimes(0);

      await vi.advanceTimersByTimeAsync(10);
      expect(server.getSpy().mock.calls).toEqual([
        [s({ op: GatewayOpcodes.Heartbeat, d: 1 })],
      ]);
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
            GatewayIntentBits.GuildMessages,
        },
      };
      expect(server.getSpy()).toBeCalledWith(s(identityPayload));
    });

    describe("after ready event", () => {
      const heartbeat_interval = 7500;
      let resumeServer: WebSocketServerMock;
      let readyPayload: GatewayReadyDispatch;
      beforeEach(async () => {
        resumeServer = WebSocketServerMock.createInstance();
        readyPayload = readyMsg({
          resume_gateway_url: resumeServer.getUrl(),
        });

        shardSocket.open();
        await vi.advanceTimersByTimeAsync(100);
        server.send(
          s(
            helloMsg({
              heartbeat_interval,
            }),
          ),
        );
        await vi.advanceTimersByTimeAsync(100);
        server.send(s(readyPayload));
        await vi.advanceTimersByTimeAsync(50);
        server.getSpy().mockClear();
      });

      it("should keep heartbit interval using hello reponse interval", async () => {
        await vi.advanceTimersByTimeAsync(heartbeat_interval);
        server.send(s(heartbeatAckMsg()));
        server.getSpy().mockClear();

        const heartbeat_interval_wait = 3;
        const expectedCalls = [];
        for (let i = 0; i < heartbeat_interval_wait; i++) {
          await vi.advanceTimersByTimeAsync(heartbeat_interval);
          server.send(s(heartbeatAckMsg()));
          expectedCalls.push([s({ op: GatewayOpcodes.Heartbeat, d: 1 })]);
        }
        expect(server.getSpy().mock.calls).toEqual(expectedCalls);
      });

      it("should close connection when an app doesn't receive a Heartbeat ACK", async () => {
        const closeEventSpy = vi.fn();
        server.on("wsclose", closeEventSpy);

        await vi.advanceTimersByTimeAsync(heartbeat_interval);
        server.send(s(heartbeatAckMsg()));
        await vi.advanceTimersByTimeAsync(heartbeat_interval - 1);

        server.getSpy().mockClear();

        await vi.advanceTimersByTimeAsync(heartbeat_interval * 9);

        expect(closeEventSpy).toHaveBeenCalledExactlyOnceWith(
          1001,
          "cya later alligator",
        );
        expect(server.getSpy().mock.calls).toEqual([
          [s({ op: GatewayOpcodes.Heartbeat, d: 1 })],
        ]);
      });

      describe("when discord close active connection", () => {
        beforeEach(async () => {
          await vi.advanceTimersByTimeAsync(20);
          server.emit(
            "close",
            WsClosedCode.GoingAway,
            "Discord WebSocket requesting client reconnect.",
          );
        });

        it("should open new connection on resume server version 10 using json encoding", async () => {
          const wsCoSpy = vi.fn();
          resumeServer.on("wsconnection", wsCoSpy);

          await vi.advanceTimersByTimeAsync(100);

          expect(wsCoSpy).toHaveBeenCalledExactlyOnceWith(
            shardSocket.ws,
            `${resumeServer.getUrl()}?v=10&encoding=json`,
          );
        });

        it("should send resume event to replay missed events when a disconnected client resumes", async () => {
          const serverSp = resumeServer.getSpy();

          await vi.advanceTimersByTimeAsync(101);

          expect(serverSp.mock.calls).toEqual([
            [
              s({
                op: GatewayOpcodes.Resume,
                d: {
                  token: gateway.token,
                  session_id: readyPayload.d.session_id,
                  seq: 1,
                },
              }),
            ],
          ]);
        });
      });
    });
  });
});
