import WebSocket from "ws";
import { GatewaySocket } from "./GatewaySocket.js";
import { GatewayOpcodes } from "discord.js";
import { GWSEvent } from "./gatewaytypes.js";
import { getTimeoutReject } from "../utils/getTimeoutReject.js";

const encoding = "json";

// todo: implement erlpack https://github.com/discord/erlpack

export class ShardSocket {
  ws: null | WebSocket;
  heartbitInterval: null | number;
  heartbitHandler: () => void;
  heartbitTimer: null | ReturnType<typeof setTimeout>;
  s: number;
  session: number;
  shard: number;
  main: GatewaySocket;

  static maxTimeout = 5000;

  constructor(main: GatewaySocket, shard: number) {
    this.ws = null;
    this.heartbitInterval = null;
    this.heartbitHandler = () => {};
    this.heartbitTimer = null;
    this.s = -1;
    this.session = -1;
    this.shard = shard;
    this.main = main;
  }

  acknowledge() {
    this.main.emit(GWSEvent.Debug, this.shard, "heartbit acknowledged");
    this.heartbitHandler = () => this.beat();
  }

  beat() {
    this.main.emit(GWSEvent.Debug, this.shard, "sending heartbit");
    this.ws?.send(
      JSON.stringify({
        op: GatewayOpcodes.Heartbeat,
        d: this.s,
      }),
    );
    this.heartbitHandler = () => this.resume();
  }

  resume() {
    this.main.emit(GWSEvent.Debug, this.shard, "attempting resume");
    this.close()
      .then(() => this.open())
      .then(() => {
        this.main.emit(GWSEvent.Debug, this.shard, "sent resume packet");
        this.ws?.send(
          JSON.stringify({
            op: GatewayOpcodes.Resume,
            d: {
              token: this.main.token,
              session_id: this.session,
              seq: this.s,
            },
          }),
        );
      });
  }

  close(): Promise<void> {
    this.main.emit(
      GWSEvent.Debug,
      this.shard,
      "client attempting to close connection",
    );
    if (this.heartbitTimer) {
      clearInterval(this.heartbitTimer);
    }
    return new Promise((resolve, reject) => {
      const timer = getTimeoutReject(
        ShardSocket.maxTimeout,
        "ShardSocket.close",
        reject,
      );

      if (this.ws?.readyState !== WebSocket.CLOSED) {
        this.ws?.close(1001, "cya later alligator");
        this.ws?.removeAllListeners("close");
        this.ws?.once("close", () => {
          this.main.emit(
            GWSEvent.Debug,
            this.shard,
            "client closed connection",
          );
          clearTimeout(timer);
          resolve();
        });
      } else {
        clearTimeout(timer);
        resolve();
      }
    });
  }

  open(): Promise<{ timeReady: number; socket: ShardSocket }> {
    this.main.emit(GWSEvent.Debug, this.shard, "starting connection packet");
    return new Promise((resolve, reject) => {
      const timer = getTimeoutReject(
        ShardSocket.maxTimeout,
        "ShardSocket.open",
        reject,
      );

      this.ws = new WebSocket(this.main.url + "?v=10&encoding=" + encoding);
      this.ws?.once("open", () => {
        this.main.emit(GWSEvent.Debug, this.shard, "opened connection");
        this.ws?.once("message", (data) => {
          const payload: { d: { heartbeat_interval: number } } = JSON.parse(
            data.toString(),
          );

          this.main.emit(
            GWSEvent.Debug,
            this.shard,
            "recieved heartbeat info",
            {
              payload,
            },
          );
          this.heartbitInterval = payload.d.heartbeat_interval;
          this.heartbitHandler = () => this.beat();
          if (this.heartbitTimer) {
            clearInterval(this.heartbitTimer);
          }
          this.heartbitTimer = setInterval(() => {
            if (this.heartbitHandler) {
              this.heartbitHandler();
            }
          }, this.heartbitInterval);

          setTimeout(
            () => {
              clearTimeout(timer);
              resolve(this.identify());
            },
            5000 - Date.now() + this.main.lastReady,
          );
        });
      });
      this.ws?.once("close", (code: string, reason: string) => {
        this.main.emit(GWSEvent.Debug, this.shard, "server closed connection", {
          code,
          reason,
        });
        setTimeout(() => this.close().then(() => this.open()), 10000);
      });
      this.ws?.once("error", (e) => {
        this.main.emit(GWSEvent.Debug, this.shard, "recieved error", e);
        setTimeout(() => this.close().then(() => this.open()), 5000);
      });
    });
  }

  send(data: object) {
    this.ws?.send(JSON.stringify(data));
  }

  identify(): Promise<{ timeReady: number; socket: ShardSocket }> {
    return new Promise((resolve, reject) => {
      const timer = getTimeoutReject(
        ShardSocket.maxTimeout,
        "ShardSocket.identify",
        reject,
      );
      this.main.emit(GWSEvent.Debug, this.shard, "sent identify packet");
      this.ws?.send(
        JSON.stringify({
          op: GatewayOpcodes.Identify,
          d: {
            token: this.main.token,
            properties: {},
            shard: [this.shard, this.main.shards],
            compress: false,
            large_threshold: 250,
            presence: {},
          },
        }),
      );

      this.ws?.on("message", (data) => {
        const payload: { s: number; op: GatewayOpcodes; t: string; d: any } =
          JSON.parse(data.toString());
        this.s = payload.s;
        this.main.emit(GWSEvent.Payload, this.shard, payload);
        if (payload.op === GatewayOpcodes.HeartbeatAck) {
          this.acknowledge();
        } else if (payload.t === "RESUMED") {
          this.main.emit(GWSEvent.Debug, this.shard, "successfully resumed");
        } else if (payload.op === GatewayOpcodes.Dispatch) {
          const { t, d } = payload;
          this.main.emit(<any>t, this.shard, d);
        }
      });
      this.ws?.once("message", (data) => {
        const payload: {
          t: string;
          d: { session_id: number };
          op: GatewayOpcodes;
        } = JSON.parse(data.toString());

        if (payload.t === "READY") {
          this.session = payload.d.session_id;
          this.main.emit(GWSEvent.Debug, this.shard, "is ready");
          clearTimeout(timer);
          resolve({ timeReady: Date.now(), socket: this });
        } else if (payload.op === 9) {
          this.main.emit(
            GWSEvent.Debug,
            this.shard,
            "invalid session, reconnecting in 5",
          );
          setTimeout(() => this.close().then(() => this.open()), 5000);
        }
      });
    });
  }
}
