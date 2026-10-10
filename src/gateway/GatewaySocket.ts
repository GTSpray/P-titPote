import { ShardSocket } from './ShardSocket.js';
import { discordapi } from '../utils/discordapi.js';
import type {
  APIGatewayBotInfo,
  GatewayPresenceUpdateData,
} from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import { logger } from '../logger.js';
import { type GatewayEvent } from './gatewaytypes.js';
import { TypedEventEmitter } from './TypedEventEmitter.js';
import { IdentifyLimiter } from './IdentifyLimiter.js';

const lowSessionStartRemaining = 100;

export class GatewaySocket extends TypedEventEmitter<GatewayEvent> {
  public token: string;
  public shards: number | null;
  private sockets: Map<number, ShardSocket>;
  public url: string;
  public presence?: GatewayPresenceUpdateData;
  public readonly identifyLimiter = new IdentifyLimiter();

  constructor(token: string, shards?: number) {
    super();
    this.token = token;
    this.shards = shards ? shards : null;
    this.sockets = new Map();
    this.url = '';
  }

  private async setSocket(socketId: number) {
    const oldSocket = this.sockets.get(socketId);
    if (oldSocket) {
      logger.debug('GatewaySocket.setSocket close', { sockId: socketId });
      await oldSocket.close();
    }

    const newSocket = new ShardSocket(this, socketId);
    this.sockets.set(socketId, newSocket);
    await newSocket.open();
    logger.debug('GatewaySocket.setSocket', { sockId: socketId });
  }

  async connect(start = 0, end?: number) {
    const apigatewayInfosBot: APIGatewayBotInfo = (await discordapi.get(
      Routes.gatewayBot(),
    )) as APIGatewayBotInfo;

    const { url, shards, session_start_limit } = apigatewayInfosBot;

    logger.debug('GatewaySocket.connect', { apigatewayInfosBot });

    this.url = url;
    if (this.shards === null) {
      this.shards = shards;
    }

    if (session_start_limit) {
      const level =
        session_start_limit.remaining < lowSessionStartRemaining
          ? 'error'
          : 'info';
      logger[level]('gateway session start limit', { session_start_limit });
    }

    end = end || this.shards;

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
