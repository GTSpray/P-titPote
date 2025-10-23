import {
  GatewayDispatchEvents,
  GatewayHeartbeatAck,
  GatewayHello,
  GatewayInvalidSession,
  GatewayOpcodes,
  GatewayReadyDispatch,
  GatewayReconnect,
  GatewayResume,
  GatewayResumedDispatch,
} from "discord.js";
import { getRandomString, randomDiscordId19 } from "./discord-api/utils.js";

export const helloMsg = (d: { heartbeat_interval?: number }): GatewayHello => ({
  t: null,
  s: null,
  op: GatewayOpcodes.Hello,
  d: {
    heartbeat_interval: 41250,
    ...d,
  },
});
export const readyMsg = (d: any): GatewayReadyDispatch => ({
  t: GatewayDispatchEvents.Ready,
  s: 1,
  op: GatewayOpcodes.Dispatch,
  d: {
    v: 10,
    user_settings: {},
    user: {
      verified: true,
      username: "P'titPote",
      public_flags: 524288,
      primary_guild: null,
      mfa_enabled: true,
      id: randomDiscordId19(),
      global_name: null,
      flags: 524288,
      email: null,
      discriminator: getRandomString({
        length: 4,
        number: true,
      }),
      clan: null,
      bot: true,
      avatar: getRandomString({
        length: 32,
        number: true,
        letter: true,
      }),
    },
    shard: [0, 1],
    session_type: "normal",
    session_id: getRandomString({
      length: 32,
      number: true,
      letter: true,
    }),
    resume_gateway_url: "wss://gateway-us-east1-c.discord.gg",
    relationships: [],
    private_channels: [],
    presences: [],
    guilds: [
      {
        unavailable: true,
        id: randomDiscordId19(),
      },
    ],
    guild_join_requests: [],
    geo_ordered_rtc_regions: [
      "milan",
      "paris",
      "frankfurt",
      "rotterdam",
      "london",
    ],
    game_relationships: [],
    auth: {},
    application: {
      id: randomDiscordId19(),
      flags: 27828224,
    },
    ...d,
  },
});

export const heartbeatAckMsg = (): GatewayHeartbeatAck =>
  <GatewayHeartbeatAck>{
    t: null,
    s: null,
    op: GatewayOpcodes.HeartbeatAck,
    d: null, // never but in fact null
  };

export const reconnectMsg = (): GatewayReconnect =>
  <GatewayReconnect>{
    t: null,
    s: null,
    op: GatewayOpcodes.Reconnect,
    d: null, // never but in fact null
  };

export const invalidSessionMsg = (d: boolean = false): GatewayInvalidSession =>
  <GatewayInvalidSession>{
    t: null,
    s: null,
    op: GatewayOpcodes.InvalidSession,
    d,
  };

export const resumedMsg = (): GatewayResumedDispatch =>
  <GatewayResumedDispatch>{
    t: GatewayDispatchEvents.Resumed,
    op: GatewayOpcodes.Dispatch,
    d: {
      _trace: [
        '["gateway-prd-arm-us-east1-b-6k49",{"micros":907,"calls":["id_created",{"micros":0,"calls":[]},"session_lookup_time",{"micros":626,"calls":[]},"session_lookup_finished",{"micros":10,"calls":[]},"discord-sessions-prd-2-97",{"micros":12}]}]',
      ],
    },
  };
