import { REST, Routes } from "discord.js";
import { GatewaySocket } from "../../../src/gateway/GatewaySocket.js";
import { DiscrodRESTMock, DiscrodRESTMockVerb } from "../../mocks/discordjs.js";
import { ShardSocket } from "../../../src/gateway/ShardSocket.js";
import * as ShardSocketModule from "../../../src/gateway/ShardSocket.js";
import { MockInstance } from "vitest";

vi.mock("../../../src/gateway/ShardSocket.js");

describe("GatewaySocket", () => {
  const fakeToken = "fake token";
  let gateway: GatewaySocket;

  beforeEach(() => {
    gateway = new GatewaySocket(fakeToken);
  });
  it("should instance", () => {
    expect(gateway).toBeTruthy();
  });

  describe("connect", () => {
    const fakeUrl = "wss://gateway.discord.gg";
    const fakeshards = 1;

    let shardSocketOpenSpy: MockInstance<() => Promise<void>>;
    let shardSocketCloseSpy: MockInstance<() => Promise<void>>;

    beforeEach(() => {
      shardSocketOpenSpy = vi
        .spyOn(ShardSocket.prototype, "open")
        .mockResolvedValue();

      shardSocketCloseSpy = vi
        .spyOn(ShardSocket.prototype, "close")
        .mockResolvedValue();

      DiscrodRESTMock.register(
        {
          verb: DiscrodRESTMockVerb.get,
          fullRoute: Routes.gatewayBot(),
        },
        {
          url: fakeUrl,
          session_start_limit: {
            max_concurrency: 1,
            remaining: 973,
            reset_after: 74572774,
            total: 1000,
          },
          shards: fakeshards,
        },
      );
    });

    it("should call discord api to determine websocket url and recomended shards", async () => {
      const getSpy = vi.spyOn(REST.prototype, "get");
      await gateway.connect();

      expect(getSpy).toHaveBeenCalledWith(Routes.gatewayBot());
      expect(gateway.url).toBe(fakeUrl);
      expect(gateway.shards).toBe(fakeshards);
    });

    it("should create one ShardSocket for each shard", async () => {
      const ShardSocketConstructor = vi
        .spyOn(ShardSocketModule, "ShardSocket")
        .mockImplementationOnce(
          () =>
            ({
              open: vi.fn().mockResolvedValue(undefined),
            }) as unknown as ShardSocket,
        );
      await gateway.connect();
      expect(ShardSocketConstructor).toHaveBeenCalledWith(gateway, 0);
    });

    it("should open created ShardSocket", async () => {
      await gateway.connect();
      expect(shardSocketOpenSpy).toHaveBeenCalledWith();
    });

    it("should close previous created ShardSocket", async () => {
      await gateway.connect();
      await gateway.connect();
      expect(shardSocketCloseSpy).toHaveBeenCalledWith();
    });
  });

  describe("send", () => {
    let shardSocketOpenSpy: MockInstance<(data: object) => void>;
    beforeEach(async () => {
      vi.spyOn(ShardSocket.prototype, "open").mockResolvedValue();

      shardSocketOpenSpy = vi.spyOn(ShardSocket.prototype, "send");

      DiscrodRESTMock.register(
        {
          verb: DiscrodRESTMockVerb.get,
          fullRoute: Routes.gatewayBot(),
        },
        {
          url: "wss://gateway.discord.gg",
          session_start_limit: {
            max_concurrency: 1,
            remaining: 973,
            reset_after: 74572774,
            total: 1000,
          },
          shards: 1,
        },
      );

      await gateway.connect();
    });

    it("should call ShardSocket.send", () => {
      const d = { data: "fake payload " };
      gateway.send(d);

      expect(shardSocketOpenSpy).toHaveBeenCalledWith(d);
    });
  });
});
