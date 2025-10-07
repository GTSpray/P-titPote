import WebSocket from "ws";
import { GatewaySocket } from "./GatewaySocket.js";
import {
  GatewayDispatchEvents,
  GatewayHeartbeatAck,
  GatewayHello,
  GatewayIntentBits,
  GatewayOpcodes,
  GatewayReadyDispatch,
} from "discord.js";
import { GWSEvent } from "./gatewaytypes.js";
import { getPromiseWithTimeout } from "../utils/getPromiseWithTimeout.js";

const encoding = "json";
const apiVerison = "10";

// todo: implement erlpack https://github.com/discord/erlpack
const s = JSON.stringify;

export class ShardSocket {
  ws: null | WebSocket;
  heartbitInterval: number;
  heartbitTimer: null | ReturnType<typeof setInterval>;
  heartbitTimeOut: null | ReturnType<typeof setTimeout>;
  s: number | null;
  session: string | null;
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
    this.session = null;
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

  hello(e: GatewayHello) {
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

  send(d: object) {
    this.ws?.send(s(d));
  }

  beat() {
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

  beatAck(e: GatewayHeartbeatAck) {
    this.main.emit(GWSEvent.Debug, this.shard, "heartbit acknowledged");
    if (this.heartbitTimeOut) {
      clearTimeout(this.heartbitTimeOut);
      this.heartbitTimeOut = null;
    }
  }

  dispatch(e: any) {
    const { t, d } = e;
    this.main.emit(<any>t, this.shard, d);
  }

  ready(e: GatewayReadyDispatch) {
    this.main.emit(GWSEvent.Debug, this.shard, "recieved ready info");
    this.resumeGatewayUrl = e.d.resume_gateway_url;
  }

  onMessage(d: WebSocket.RawData) {
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
      case GatewayDispatchEvents.Ready:
        this.ready(<any>e);
        break;
      default:
        break;
    }
  }

  identify() {
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

  open(): Promise<{ timeReady: number; socket: ShardSocket }> {
    if (this.destroyed) {
      return Promise.reject(
        new Error("destroyed ShardSocket should be removed"),
      );
    }
    this.main.emit(GWSEvent.Debug, this.shard, "starting connection packet");

    this.ws = new WebSocket(
      `${this.main.url}?v=${apiVerison}&encoding=${encoding}`,
    );

    this.ws?.once("open", () => {
      this.main.emit(GWSEvent.Debug, this.shard, "opened connection");
    });
    this.ws?.on("message", (data: WebSocket.RawData) => {
      this.onMessage(data);
    });
    this.ws?.once("close", (code: string, reason: string) => {
      this.main.emit(GWSEvent.Debug, this.shard, "server closed connection", {
        code,
        reason: reason.toString(),
      });
    });
    this.ws?.once("error", (e) => {
      this.main.emit(GWSEvent.Debug, this.shard, "recieved error", e);
    });

    return getPromiseWithTimeout(
      this.maxTimeout,
      "ShardSocket.open timed out after %t ms",
      (resolve) => {
        this.main.on(GatewayDispatchEvents.Ready, (s, d) => {
          this.session = d.session_id;
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
