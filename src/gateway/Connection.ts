import WebSocket from "ws";
import { GatewaySocket } from "./GatewaySocket.js";
import { GatewayOpcodes } from "discord.js";
import { GWSEvent } from "./gatewaytypes.js";

const encoding = "json";
const maxTimeout = 5000;

export class Connection {
  wss: null | WebSocket;
  heartbitInterval: null | number;
  heartbitHandler: () => void;
  heartbitTimer: null | ReturnType<typeof setTimeout>;
  s: number;
  session: number;
  shard: number;
  main: GatewaySocket;

  constructor(main: GatewaySocket, shard: number) {
    this.wss = null;
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
    this.wss?.send(
      JSON.stringify({
        op: 1,
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
        this.wss?.send(
          JSON.stringify({
            op: 6,
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
      const timer = setTimeout(() => {
        reject(new Error(`Connection.close timed out after ${maxTimeout}ms`));
      }, maxTimeout);

      if (this.wss?.readyState !== 3) {
        this.wss?.close(1001, "cya later alligator");
        this.wss?.removeAllListeners("close");
        this.wss?.once("close", () => {
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

  open(): Promise<{ timeReady: number; socket: Connection }> {
    this.main.emit(GWSEvent.Debug, this.shard, "starting connection packet");
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Connection.connect timed out after ${maxTimeout}ms`));
      }, maxTimeout);

      this.wss = new WebSocket(this.main.url + "?encoding=" + encoding);
      this.wss?.once("open", () => {
        this.main.emit(GWSEvent.Debug, this.shard, "opened connection");
        this.wss?.once("message", (data) => {
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
      this.wss?.once("close", (code: string, reason: string) => {
        this.main.emit(GWSEvent.Debug, this.shard, "server closed connection", {
          code,
          reason,
        });
        setTimeout(() => this.close().then(() => this.open()), 10000);
      });
      this.wss?.once("error", (e) => {
        this.main.emit(GWSEvent.Debug, this.shard, "recieved error", e);
        setTimeout(() => this.close().then(() => this.open()), 5000);
      });
    });
  }

  send(data: object) {
    this.wss?.send(JSON.stringify(data));
  }

  identify(): Promise<{ timeReady: number; socket: Connection }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(`Connection.identify timed out after ${maxTimeout}ms`),
        );
      }, maxTimeout);

      this.main.emit(GWSEvent.Debug, this.shard, "sent identify packet");
      this.wss?.send(
        JSON.stringify({
          op: 2,
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
      this.wss?.on("message", (data) => {
        const payload: { s: number; op: number; t: string; d: any } =
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
      this.wss?.once("message", (data) => {
        const payload: { t: string; d: { session_id: number }; op: number } =
          JSON.parse(data.toString());

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
