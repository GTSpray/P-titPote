import EventEmitter from "events";
import { Connection } from "./Connection";
import { discordapi } from "../utils/discordapi";
import { APIGatewayBotInfo, Routes } from "discord.js";

export class GatewaySocket extends EventEmitter {
  token: string;
  shards: number | null;
  sockets: Map<number, Connection>;
  lastReady: number;
  url: any;
  constructor(token: string, shards?: number) {
    super();
    this.token = token;
    this.shards = shards ? shards : null;
    this.sockets = new Map();
    this.lastReady = 0;
  }

  async connect(start = 0, end?: number) {
    const { url, shards } = (await discordapi.get(
      Routes.gatewayBot(),
    )) as APIGatewayBotInfo;
    this.url = url;
    if (isNaN(<number>this.shards)) {
      this.shards = shards;
    }
    end = end || <number>this.shards;
    for (let i = start; i < end; i++) {
      const oldSocket = this.sockets.get(i);
      if (oldSocket) {
        await oldSocket.close();
      }

      const co = new Connection(this, i);
      this.sockets.set(i, co);
      const { timeReady } = await co.connect();
      this.lastReady = timeReady;
    }
  }

  send(data: object, shard = 0) {
    const socket = this.sockets.get(shard);
    if (socket) {
      socket.send(data);
    }
  }
}
