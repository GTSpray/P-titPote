import { REST, Routes } from "discord.js";
import { GatewaySocket } from "../../../src/gateway/GatewaySocket.js";
import { DiscrodRESTMock, DiscrodRESTMockVerb } from "../../mocks/discordjs.js";
import { Connection } from "../../../src/gateway/Connection.js";
import * as connectionModule from "../../../src/gateway/Connection.js";
import { MockInstance } from "vitest";

vi.mock("../../../src/gateway/Connection.js");

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

    let connectionOpenSpy: MockInstance<
      () => Promise<{ timeReady: number; socket: Connection }>
    >;
    let connectionCloseSpy: MockInstance<() => Promise<void>>;

    beforeEach(() => {
      connectionOpenSpy = vi
        .spyOn(Connection.prototype, "open")
        .mockResolvedValue({
          timeReady: 1,
          socket: vi.fn() as unknown as Connection,
        });

      connectionCloseSpy = vi
        .spyOn(Connection.prototype, "close")
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

    it("should create one connection for each shard", async () => {
      const ConnectionConstructor = vi
        .spyOn(connectionModule, "Connection")
        .mockImplementationOnce(
          () =>
            ({
              open: vi
                .fn()
                .mockResolvedValue({ timeReady: 1, socket: vi.fn() }),
            }) as unknown as Connection,
        );
      await gateway.connect();
      expect(ConnectionConstructor).toHaveBeenCalledWith(gateway, 0);
    });

    it("should open created connection", async () => {
      await gateway.connect();
      expect(connectionOpenSpy).toHaveBeenCalledWith();
    });

    it("should close previous created connection", async () => {
      await gateway.connect();
      await gateway.connect();
      expect(connectionCloseSpy).toHaveBeenCalledWith();
    });
  });

  describe("send", () => {
    let connectionOpenSpy: MockInstance<(data: object) => void>;
    beforeEach(async () => {
      vi.spyOn(Connection.prototype, "open").mockResolvedValue({
        timeReady: 1,
        socket: vi.fn() as unknown as Connection,
      });

      connectionOpenSpy = vi.spyOn(Connection.prototype, "send");

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

    it("should call connection.send", () => {
      const d = { data: "fake payload " };
      gateway.send(d);

      expect(connectionOpenSpy).toHaveBeenCalledWith(d);
    });
  });
});
