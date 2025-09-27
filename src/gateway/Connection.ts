import WebSocket from "ws";
import { GatewaySocket } from "./GatewaySocket.js";

let parse = (func: {
  (payload: any): void;
  (payload: any): void;
  (payload: any): void;
  (arg0: any): void;
}) => {
  return (data: string) => {
    func(JSON.parse(data));
  };
};
let stringify = JSON.stringify;
let encoding = "json";

export class Connection {
  socket: null | WebSocket;
  hbinterval: null | number;
  hbfunc: null | (() => void);
  hbtimer: null | ReturnType<typeof setTimeout>;
  s: number;
  session: number;
  shard: number;
  main: GatewaySocket;

  constructor(main: GatewaySocket, shard: number) {
    this.socket = null;
    this.hbinterval = null;
    this.hbfunc = null;
    this.hbtimer = null;
    this.s = -1;
    this.session = -1;
    this.shard = shard;
    this.main = main;
  }

  acknowledge() {
    this.main.emit("DEBUG", this.shard, "hb acknowledged");
    this.hbfunc = this.beat;
  }

  beat() {
    this.main.emit("DEBUG", this.shard, "sending hb");
    this.socket?.send(
      stringify({
        op: 1,
        d: this.s,
      }),
    );
    this.hbfunc = this.resume;
  }

  resume() {
    this.main.emit("DEBUG", this.shard, "attempting resume");
    this.close()
      .then(() => this.connect())
      .then(() => {
        this.main.emit("DEBUG", this.shard, "sent resume packet");
        this.socket?.send(
          stringify({
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
      "DEBUG",
      this.shard,
      "client attempting to close connection",
    );
    if (this.hbtimer) {
      clearInterval(this.hbtimer);
    }
    return new Promise((resolve) => {
      if (this.socket?.readyState !== 3) {
        this.socket?.close(1001, "cya later alligator");
        this.socket?.removeAllListeners("close");
        this.socket?.once("close", () => {
          this.main.emit("DEBUG", this.shard, "client closed connection");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  connect(): Promise<{ timeReady: number; socket: Connection }> {
    this.main.emit("DEBUG", this.shard, "starting connection packet");
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.main.url + "?encoding=" + encoding);
      this.socket?.once("open", () => {
        this.main.emit("DEBUG", this.shard, "opened connection");
        this.socket?.once(
          "message",
          parse((payload: { d: { heartbeat_interval: number } }) => {
            this.main.emit("DEBUG", this.shard, "recieved heartbeat info", {
              payload,
            });
            this.hbinterval = payload.d.heartbeat_interval;
            this.hbfunc = this.beat;
            if (this.hbtimer) {
              clearInterval(this.hbtimer);
            }
            this.hbtimer = setInterval(() => {
              if (this.hbfunc) {
                this.hbfunc();
              }
            }, this.hbinterval);

            setTimeout(
              () => resolve(this.identify()),
              5000 - Date.now() + this.main.lastReady,
            );
          }),
        );
      });
      this.socket?.once("close", (code: string, reason: string) => {
        this.main.emit("DEBUG", this.shard, "server closed connection. code", {
          code,
          reason,
        });
        setTimeout(() => this.close().then(() => this.connect()), 10000);
      });
      this.socket?.once("error", (e) => {
        this.main.emit("DEBUG", this.shard, "recieved error", e);
        setTimeout(() => this.close().then(() => this.connect()), 5000);
      });
    });
  }

  send(data: object) {
    this.socket?.send(stringify(data));
  }

  identify(): Promise<{ timeReady: number; socket: Connection }> {
    return new Promise((resolve, reject) => {
      this.main.emit("DEBUG", this.shard, "sent identify packet");
      this.socket?.send(
        stringify({
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
      this.socket?.on(
        "message",
        parse((payload: { s: number; op: number; t: string; d: any }) => {
          this.s = payload.s;
          this.main.emit("PAYLOAD", this.shard, payload);
          if (payload.op === 11) {
            this.acknowledge();
          } else if (payload.t === "RESUMED") {
            this.main.emit("DEBUG", this.shard, "successfully resumed");
          } else if (payload.op === 0) {
            this.main.emit(payload.t, this.shard, payload.d);
          }
        }),
      );
      this.socket?.once(
        "message",
        parse(
          (payload: { t: string; d: { session_id: number }; op: number }) => {
            if (payload.t === "READY") {
              this.session = payload.d.session_id;
              this.main.emit("DEBUG", this.shard, "is ready");
              resolve({ timeReady: Date.now(), socket: this });
            } else if (payload.op === 9) {
              this.main.emit(
                "DEBUG",
                this.shard,
                "invalid session, reconnecting in 5",
              );
              setTimeout(() => this.close().then(() => this.connect()), 5000);
            }
          },
        ),
      );
    });
  }
}
