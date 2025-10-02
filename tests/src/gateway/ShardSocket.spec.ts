import { ShardSocket } from "../../../src/gateway/ShardSocket.js";
import { GatewaySocket } from "../../../src/gateway/GatewaySocket.js";
import { helloMsg, readyMsg } from "../../mocks/discordGatewayMsg.js";
import { GatewayIntentBits, GatewayOpcodes } from "discord.js";
import { WebSocketServerMock } from "../../mocks/WebSocketMock.js";
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
    it("should reject with timeout (ShardSocket.maxTimeout) when Discord does not send a welcome message", async () => {
      const helloDelay = 100;
      const openPromise = shardSocket.open();
      vi.advanceTimersByTime(helloDelay);
      server.send(s(helloMsg({})));
      vi.advanceTimersByTime(ShardSocket.maxTimeout - helloDelay);

      server.send(s(readyMsg({}))); // to late
      await expect(openPromise).rejects.toThrow(
        Error(`ShardSocket.open timed out after ${ShardSocket.maxTimeout}ms`),
      );
    });

    it("should resolve connection if server send welcome message earlier than timeout", async () => {
      const openPromise = shardSocket.open();

      vi.advanceTimersByTime(100);
      server.send(s(helloMsg({})));
      vi.advanceTimersByTime(100);
      server.send(s(readyMsg({})));

      vi.advanceTimersByTime(ShardSocket.maxTimeout);

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

      vi.advanceTimersByTime(100);
      server.send(
        s(
          helloMsg({
            heartbeat_interval,
          }),
        ),
      );
      vi.advanceTimersByTime(100);
      server.send(s(readyMsg({})));
      server.getSpy().mockClear();

      vi.advanceTimersByTime(heartbeat_interval * fakejitter - 102);

      expect(server.getSpy()).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(10);
      expect(server.getSpy().mock.calls).toEqual([
        [s({ op: GatewayOpcodes.Heartbeat, d: null })],
      ]);
    });

    it("should send identify with intents", async () => {
      shardSocket.open().catch(() => {});
      vi.advanceTimersByTime(100);
      server.send(s(helloMsg({})));
      vi.advanceTimersByTime(100);

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
      const heartbeat_interval = 2500;

      beforeEach(() => {
        shardSocket.open().catch(() => {});
        vi.advanceTimersByTime(100);
        server.send(
          s(
            helloMsg({
              heartbeat_interval,
            }),
          ),
        );
        vi.advanceTimersByTime(100);
        server.send(s(readyMsg({})));
        server.getSpy().mockClear();
      });

      it("should keep heartbit interval using hello reponse interval", async () => {
        vi.advanceTimersByTime(heartbeat_interval);
        server.getSpy().mockClear();

        const heartbeat_interval_wait = 3;

        vi.advanceTimersByTime(heartbeat_interval * heartbeat_interval_wait);
        expect(server.getSpy()).toHaveBeenNthCalledWith(
          heartbeat_interval_wait,
          s({ op: GatewayOpcodes.Heartbeat, d: null }),
        );
        expect(server.getSpy()).toHaveBeenCalledTimes(heartbeat_interval_wait);
      });
    });
  });
});
