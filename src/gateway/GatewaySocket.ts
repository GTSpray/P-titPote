import EventEmitter from "node:events";
import { Connection } from "./Connection.js";
import { discordapi } from "../utils/discordapi.js";
import { type APIGatewayBotInfo, Routes } from "discord.js";
import { logger } from "../logger.js";
import { type GatewayEvent } from "./gatewaytypes.js";

class TypedEventEmitter<TEvents extends Record<string, any>> {
  private emitter = new EventEmitter();

  emit<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    ...eventArg: TEvents[TEventName]
  ) {
    this.emitter.emit(eventName, ...(eventArg as []));
  }

  on<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    this.emitter.on(eventName, handler as any);
  }

  off<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    this.emitter.off(eventName, handler as any);
  }
}

export class GatewaySocket extends TypedEventEmitter<GatewayEvent> {
  public token: string;
  public shards: number | null;
  public sockets: Map<number, Connection>;
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

  async connect(start = 0, end?: number) {
    const { url, shards } = (await discordapi.get(
      Routes.gatewayBot(),
    )) as APIGatewayBotInfo;

    logger.debug("GatewaySocket.connect", { url, shards });

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
      logger.debug("GatewaySocket.connect connect");
      const { timeReady } = await co.connect();
      logger.debug("GatewaySocket.connect", { timeReady });
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
