import { WebSocketServer } from "ws";
import { ShardSocket } from "../../../src/gateway/ShardSocket.js";
import { GatewaySocket } from "../../../src/gateway/GatewaySocket.js";

const port = 1664;
const url = `ws://localhost:${port}`;

ShardSocket.maxTimeout = 1000;

describe("ShardSocket", () => {
  let server: WebSocketServer;
  let shardSocket: ShardSocket;
  let gateway: GatewaySocket;

  beforeEach(() => {
    server = new WebSocketServer({ port });
    gateway = new GatewaySocket("fakeToken");
    gateway.lastReady = Date.now() - 4080;
    shardSocket = new ShardSocket(gateway, 0);

    vi.spyOn(gateway, "url", "get").mockReturnValue(url);

    server.on("connection", (ws, r) => {
      const message = { d: { heartbeat_interval: 10000 } };
      ws.send(JSON.stringify(message));
      ws.once("message", function () {
        const message = { t: "READY", d: { session_id: 1 } };
        ws.send(JSON.stringify(message));
      });
    });
  });

  afterEach(() => {
    server.close();
  });

  it.only("should connect", async () => {
    const r = await shardSocket.open();
    expect(r).toEqual({
      timeReady: expect.any(Number),
      socket: shardSocket,
    });
  });
});
