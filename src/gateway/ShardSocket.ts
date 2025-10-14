import WebSocket from "ws";
import { GatewaySocket } from "./GatewaySocket.js";
import {
  GatewayDispatchEvents,
  GatewayHeartbeatAck,
  GatewayHello,
  GatewayIntentBits,
  GatewayInvalidSession,
  GatewayOpcodes,
} from "discord.js";
import { WsClosedCode, GWSEvent } from "./gatewaytypes.js";
import { getPromiseWithTimeout } from "../utils/getPromiseWithTimeout.js";

const encoding = "json";
const apiVersion = "10";

// todo: implement erlpack https://github.com/discord/erlpack
const s = JSON.stringify;

const specificStatusCodeMappings = new Map([
  [1000, "Normal Closure"],
  [1001, "Going Away"],
  [1002, "Protocol Error"],
  [1003, "Unsupported Data"],
  [1004, "(For future)"],
  [1005, "No Status Received"],
  [1006, "Abnormal Closure"],
  [1007, "Invalid frame payload data"],
  [1008, "Policy Violation"],
  [1009, "Message too big"],
  [1010, "Missing Extension"],
  [1011, "Internal Error"],
  [1012, "Service Restart"],
  [1013, "Try Again Later"],
  [1014, "Bad Gateway"],
  [1015, "TLS Handshake"],
]);

function getStatusCodeString(code: number): string {
  if (code >= 0 && code <= 999) {
    return "(Unused)";
  } else if (code >= 1016) {
    if (code <= 1999) {
      return "(For WebSocket standard)";
    } else if (code <= 2999) {
      return "(For WebSocket extensions)";
    } else if (code <= 3999) {
      return "(For libraries and frameworks)";
    } else if (code <= 4999) {
      return "(For applications)";
    }
  }
  return specificStatusCodeMappings.get(code) || "(Unknown)";
}

export class ShardSocket {
  ws: null | WebSocket;
  heartbitInterval: number;
  heartbitTimer: null | ReturnType<typeof setInterval>;
  heartbitTimeOut: null | ReturnType<typeof setTimeout>;
  s: number | null;
  session_id: string | null;
  shard: number;
  main: GatewaySocket;
  jitter: number;
  maxTimeout: number;
  resumeGatewayUrl: string | null;
  destroyed: boolean = false;

  static maxTimeout = 15000;

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
  }

  close(): Promise<void> {
    this.main.emit(
      GWSEvent.Debug,
      this.shard,
      "client attempting to close connection",
    );

    if (this.heartbitTimer) {
      clearInterval(this.heartbitTimer);
      this.heartbitTimer = null;
    }
    if (this.heartbitTimeOut) {
      clearTimeout(this.heartbitTimeOut);
      this.heartbitTimeOut = null;
    }

    return getPromiseWithTimeout(
      ShardSocket.maxTimeout,
      "ShardSocket.close timed out after %t ms",
      (resolve) => {
        if (
          ![WebSocket.CLOSED, WebSocket.CLOSING].includes(
            <any>this.ws?.readyState,
          )
        ) {
          this.ws?.once("close", () => {
            this.main.emit(
              GWSEvent.Debug,
              this.shard,
              "client closed connection",
            );
            this.ws?.removeAllListeners("close");
            this.ws = null;
            resolve();
          });

          this.ws?.close(1001, "cya later alligator");
        } else {
          this.ws = null;
          resolve();
        }
      },
    );
  }

  private hello(e: GatewayHello) {
    this.main.emit(GWSEvent.Debug, this.shard, "recieved hello info", {
      payload: e,
    });

    this.heartbitInterval = e.d.heartbeat_interval;
    const firstBitTimeOut = Math.floor(this.heartbitInterval * this.jitter);
    setTimeout(() => {
      this.main.emit(GWSEvent.Debug, this.shard, "emit first heartbit");
      this.beat();
      this.heartbitTimer = setInterval(() => {
        this.main.emit(GWSEvent.Debug, this.shard, "emit heartbit interval");
        this.beat();
      }, this.heartbitInterval);
    }, firstBitTimeOut);

    setTimeout(() => {
      this.identify();
    }, 10);
  }

  async invalidSession(e: GatewayInvalidSession) {
    this.main.emit(GWSEvent.Debug, this.shard, "receive invalid session", {
      e,
    });
    if (e.d) {
      this.resume();
    } else {
      this.main.emit(GWSEvent.Debug, this.shard, "try to reconnect gateway");
      await this.close();
      this.session_id = null;
      this.resumeGatewayUrl = null;
      await this.open();
    }
  }

  send(d: object) {
    this.ws?.send(s(d));
  }

  private beat() {
    const e = {
      op: GatewayOpcodes.Heartbeat,
      d: this.s,
    };
    this.main.emit(GWSEvent.Debug, this.shard, "emit heartbit", { e });
    this.send(e);

    if (!this.heartbitTimeOut) {
      this.heartbitTimeOut = setTimeout(() => {
        this.close();
        this.heartbitTimeOut = null;
        this.main.emit(GWSEvent.Debug, this.shard, "no heartbit event timeout");
      }, this.heartbitInterval);
    }
  }

  private beatAck(e: GatewayHeartbeatAck) {
    this.main.emit(GWSEvent.Debug, this.shard, "heartbit acknowledged");
    if (this.heartbitTimeOut) {
      clearTimeout(this.heartbitTimeOut);
      this.heartbitTimeOut = null;
    }
  }

  private dispatch(e: any) {
    const { t, d } = e;
    this.main.emit(<any>t, this.shard, d);
  }

  private onMessage(d: WebSocket.RawData) {
    const e = JSON.parse(d.toString());
    this.main.emit(GWSEvent.Debug, this.shard, "ShardSocket.dispatch", { e });
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
        this.main.emit(GWSEvent.Debug, this.shard, "emit heartbit response");
        this.beat();
        break;
      case GatewayOpcodes.Reconnect:
        this.resume();
        break;
      case GatewayOpcodes.InvalidSession:
        this.invalidSession(<any>e);
        break;
      default:
        break;
    }
  }

  private identify() {
    this.main.emit(GWSEvent.Debug, this.shard, "sent identify packet");
    this.send({
      op: GatewayOpcodes.Identify,
      d: {
        token: this.main.token,
        shard: [this.shard, this.main.shards],
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
    });
  }

  private configureSocket(ws: WebSocket) {
    ws.on("message", (data: WebSocket.RawData) => {
      this.onMessage(data);
    });
    ws.once("close", async (code: WsClosedCode, reason: string) => {
      this.main.emit(GWSEvent.Debug, this.shard, "server closed connection", {
        code,
        codeString: getStatusCodeString(code),
        reason: reason.toString(),
      });

      if (
        [WsClosedCode.GoingAway, WsClosedCode.AbnormalClosure].includes(code)
      ) {
        this.resume();
      }
    });
    ws.once("error", (e) => {
      this.main.emit(GWSEvent.Debug, this.shard, "recieved error", e);
    });
  }

  private async resume() {
    if (this.ws) {
      this.main.emit(GWSEvent.Debug, this.shard, "close connection");
      await this.close();
    }

    this.main.emit(GWSEvent.Debug, this.shard, "try to resume connection");
    const ws = new WebSocket(
      `${this.resumeGatewayUrl}?v=${apiVersion}&encoding=${encoding}`,
    );

    ws.once("open", () => {
      this.main.emit(GWSEvent.Debug, this.shard, "resumed connection");
      const firstBitTimeOut = Math.floor(100 * this.jitter); // avoid traffic jam using jitter method
      setTimeout(() => {
        this.send({
          op: GatewayOpcodes.Resume,
          d: {
            token: this.main.token,
            session_id: this.session_id,
            seq: this.s,
          },
        });
      }, firstBitTimeOut);
    });
    this.configureSocket(ws);
    this.ws = ws;
  }

  open(): Promise<{ timeReady: number; socket: ShardSocket }> {
    if (this.destroyed) {
      return Promise.reject(
        new Error("destroyed ShardSocket should be removed"),
      );
    }
    this.main.emit(GWSEvent.Debug, this.shard, "starting connection");

    const ws = new WebSocket(
      `${this.main.url}?v=${apiVersion}&encoding=${encoding}`,
    );

    ws.once("open", () => {
      this.main.emit(GWSEvent.Debug, this.shard, "opened connection");
    });

    this.configureSocket(ws);

    this.ws = ws;

    return getPromiseWithTimeout(
      this.maxTimeout,
      "ShardSocket.open timed out after %t ms",
      (resolve) => {
        this.main.on(GatewayDispatchEvents.Ready, (s, d) => {
          this.main.emit(GWSEvent.Debug, this.shard, "recieved ready info");
          this.session_id = d.session_id;
          this.resumeGatewayUrl = d.resume_gateway_url;
          resolve({ timeReady: Date.now(), socket: this });
        });
      },
    );
  }

  destroy(): Promise<void> {
    this.destroyed = true;
    return this.close();
  }
}
