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
const onConnectionDelay = 20;

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

  async close(): Promise<void> {
    if (!this.closePromise) {
      this.closePromise = getPromiseWithTimeout(
        ShardSocket.maxTimeout,
        "ShardSocket.close timed out after %t ms",
        (resolve) => {
          this.main.emit(
            GWSEvent.Debug,
            this.shard,
            "client attempting to close connection",
          );

          if (this.heartbitTimer) {
            clearTimeout(this.heartbitTimer);
            this.heartbitTimer = null;
          }
          if (this.heartbitTimeOut) {
            clearTimeout(this.heartbitTimeOut);
            this.heartbitTimeOut = null;
          }

          if (
            ![WebSocket.CLOSED, WebSocket.CLOSING].includes(
              <any>this.ws?.readyState,
            )
          ) {
            this.ws?.once("close", async () => {
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

    try {
      await this.closePromise;
    } catch (e) {
      throw e;
    } finally {
      this.closePromise = null;
    }
  }

  private continueHeartbeat() {
    this.heartbitTimer = setTimeout(() => {
      this.main.emit(GWSEvent.Debug, this.shard, "emit heartbit interval");
      this.beat();
      this.continueHeartbeat();
    }, this.heartbitInterval);
  }

  private startHeartbeat() {
    if (!this.heartbitTimer) {
      const firstBitTimeOut = Math.floor(this.heartbitInterval * this.jitter);
      this.heartbitTimer = setTimeout(() => {
        this.main.emit(GWSEvent.Debug, this.shard, "emit first heartbit");
        this.beat();
        this.continueHeartbeat();
      }, firstBitTimeOut);
    }
  }

  private hello(e: GatewayHello) {
    this.main.emit(GWSEvent.Debug, this.shard, "recieved hello info", {
      payload: e,
    });
    this.heartbitInterval = e.d.heartbeat_interval;
  }

  async invalidSession(e: GatewayInvalidSession) {
    this.main.emit(GWSEvent.Debug, this.shard, "receive invalid session", {
      e,
    });
    if (e.d) {
      await this.resume();
    } else {
      this.main.emit(GWSEvent.Debug, this.shard, "try to reconnect gateway");
      await this.close();
      await this.open();
    }
  }

  send(d: object) {
    this.ws?.send(s(d));
  }

  private beat() {
    if (!this.heartbitTimeOut) {
      this.heartbitTimeOut = setTimeout(async () => {
        this.heartbitTimeOut = null;
        this.main.emit(
          GWSEvent.Debug,
          this.shard,
          "no heartbit ack event timeout",
        );
        await this.resume();
      }, ShardSocket.maxTimeout);
    }
    const e = {
      op: GatewayOpcodes.Heartbeat,
      d: this.s,
    };
    this.main.emit(GWSEvent.Debug, this.shard, "emit heartbit", { e });
    this.send(e);
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
    this.main.emit(<any>t, {
      shard: this.shard,
      event: d,
    });
  }

  private async onMessage(d: WebSocket.RawData) {
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
        this.main.emit(GWSEvent.Debug, this.shard, "recieved reconnect");
        await this.resume();
        break;
      case GatewayOpcodes.InvalidSession:
        await this.invalidSession(<any>e);
        break;
      default:
        break;
    }

    this.startHeartbeat();
  }

  private configureSocket(ws: WebSocket) {
    ws.on("message", async (data: WebSocket.RawData) => {
      await this.onMessage(data);
    });
    ws.once("close", async (code: WsClosedCode, reason: string) => {
      this.main.emit(GWSEvent.Debug, this.shard, "server closed connection", {
        code,
        codeString: getStatusCodeString(code),
        reason: reason.toString(),
      });

      if ([WsClosedCode.AbnormalClosure].includes(code)) {
        try {
          await this.resume();
        } catch (error) {
          this.main.emit(GWSEvent.Debug, this.shard, "fail to resume", {
            error,
          });
          await this.close();
          await this.open();
        }
      }
    });
    ws.once("error", (e) => {
      this.main.emit(GWSEvent.Debug, this.shard, "recieved error", e);
    });
  }

  private async resume() {
    if (!this.resumePromise) {
      this.resumePromise = getPromiseWithTimeout(
        this.maxTimeout,
        "ShardSocket.resume timed out after %t ms",
        async (resolve) => {
          if (this.ws) {
            this.main.emit(GWSEvent.Debug, this.shard, "close connection");
            await this.close();
          }
          this.main.emit(
            GWSEvent.Debug,
            this.shard,
            "try to resume connection",
          );
          const ws = new WebSocket(
            `${this.resumeGatewayUrl}?v=${apiVersion}&encoding=${encoding}`,
          );

          this.main.once(GatewayDispatchEvents.Resumed, () => {
            this.main.emit(
              GWSEvent.Debug,
              this.shard,
              "recieved resumed packet",
            );
            resolve(undefined);
          });
          ws.once("open", () => {
            this.main.emit(GWSEvent.Debug, this.shard, "resumed connection");
            setTimeout(() => {
              this.main.emit(GWSEvent.Debug, this.shard, "send resume packet");
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

          this.configureSocket(ws);
          this.ws = ws;
        },
      );
    }

    try {
      await this.resumePromise;
    } catch (e) {
      throw e;
    } finally {
      this.resumePromise = null;
    }
  }

  async open(): Promise<void> {
    if (this.destroyed) {
      return Promise.reject(
        new Error("destroyed ShardSocket should be removed"),
      );
    }

    if (!this.openPromise) {
      this.openPromise = getPromiseWithTimeout(
        this.maxTimeout,
        "ShardSocket.open timed out after %t ms",
        (resolve) => {
          this.main.emit(GWSEvent.Debug, this.shard, "starting connection");

          const ws = new WebSocket(
            `${this.main.url}?v=${apiVersion}&encoding=${encoding}`,
          );

          ws.once("open", () => {
            this.main.emit(GWSEvent.Debug, this.shard, "opened connection");
            setTimeout(() => {
              this.main.emit(
                GWSEvent.Debug,
                this.shard,
                "send identify packet",
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
                    os: "linux",
                    browser: "PtitPote",
                    device: "PtitPote",
                  },
                  intents:
                    GatewayIntentBits.GuildMessageReactions |
                    GatewayIntentBits.GuildMessages |
                    GatewayIntentBits.DirectMessages,
                },
              });
            }, onConnectionDelay);
          });

          this.configureSocket(ws);

          this.ws = ws;

          this.main.once(GatewayDispatchEvents.Ready, ({ event }) => {
            this.main.emit(GWSEvent.Debug, this.shard, "recieved ready info");
            this.session_id = event.session_id;
            this.resumeGatewayUrl = event.resume_gateway_url;
            resolve();
          });
        },
      );
    }

    try {
      await this.openPromise;
    } catch (e) {
      throw e;
    } finally {
      this.openPromise = null;
    }
  }

  destroy(): Promise<void> {
    this.main.emit(GWSEvent.Debug, this.shard, "destroy");
    this.destroyed = true;
    return this.close();
  }
}
