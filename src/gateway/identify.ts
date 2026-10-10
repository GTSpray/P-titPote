import {
  GatewayIntentBits,
  GatewayOpcodes,
  type GatewayIdentify,
  type GatewayPresenceUpdateData,
} from 'discord-api-types/v10';

export const GATEWAY_INTENTS =
  GatewayIntentBits.Guilds |
  GatewayIntentBits.GuildMessageReactions |
  GatewayIntentBits.GuildMessages |
  GatewayIntentBits.DirectMessages;

export function buildIdentifyPayload(options: {
  token: string;
  shard: number;
  shards: number | null;
  presence?: GatewayPresenceUpdateData;
}): GatewayIdentify {
  return {
    op: GatewayOpcodes.Identify,
    d: {
      token: options.token,
      shard: [options.shard, options.shards as number],
      compress: false,
      large_threshold: 250,
      presence: options.presence ?? ({} as GatewayPresenceUpdateData),
      properties: {
        os: 'linux',
        browser: 'PtitPote',
        device: 'PtitPote',
      },
      intents: GATEWAY_INTENTS,
    },
  };
}
