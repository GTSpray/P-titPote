import { ShardSocket } from "./ShardSocket.js";
import { discordapi } from "../utils/discordapi.js";
import { type APIGatewayBotInfo, Routes } from "discord.js";
import { logger } from "../logger.js";
import { type GatewayEvent } from "./gatewaytypes.js";
import { TypedEventEmitter } from "./TypedEventEmitter.js";

export class GatewaySocket extends TypedEventEmitter<GatewayEvent> {
  public token: string;
  public shards: number | null;
  private sockets: Map<number, ShardSocket>;
  public lastReady: number;
  public url: string;

  constructor(token: string, shards?: number) {
    super();
    this.token = token;
    this.shards = shards ? shards : null;
    this.sockets = new Map();
    this.lastReady = 0;
    this.url = "";
  }

  private async setSocket(socketId: number) {
    const oldSocket = this.sockets.get(socketId);
    if (oldSocket) {
      logger.debug("GatewaySocket.setConection close", { sockId: socketId });
      await oldSocket.close();
    }

    const newSocket = new ShardSocket(this, socketId);
    this.sockets.set(socketId, newSocket);
    const { timeReady } = await newSocket.open();
    logger.debug("GatewaySocket.setConection", { sockId: socketId, timeReady });
    this.lastReady = timeReady;
  }

  async connect(start = 0, end?: number) {
    const apigatewayInfosBot: APIGatewayBotInfo = (await discordapi.get(
      Routes.gatewayBot(),
    )) as APIGatewayBotInfo;

    const { url, shards } = apigatewayInfosBot;

    logger.debug("GatewaySocket.connect", { apigatewayInfosBot });

    this.url = url;
    if (isNaN(<number>this.shards)) {
      this.shards = shards;
    }

    end = end || <number>this.shards;

    const promises = [];
    for (let i = start; i < end; i++) {
      promises.push(this.setSocket(i));
    }
    await Promise.all(promises);
  }

  send(data: object, shard = 0) {
    const socket = this.sockets.get(shard);
    if (socket) {
      socket.send(data);
    }
  }
}
