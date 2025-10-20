import "dotenv/config";

import { GatewaySocket } from "./GatewaySocket.js";
import { GWSEvent } from "./gatewaytypes.js";
import { logger } from "../logger.js";
import {
  ActivityType,
  GatewayDispatchEvents,
  GatewayOpcodes,
  GatewayUpdatePresence,
  PresenceUpdateStatus,
} from "discord.js";

if (!process.env.BOT_TOKEN) {
  throw Error("no APP_ID provided in env");
}

export const gateway = new GatewaySocket(process.env.BOT_TOKEN);

gateway.on(GWSEvent.Debug, (shard, debugmsg, meta?) => {
  logger.debug("gateway", { shard, debugmsg, meta });
});

gateway.on(GWSEvent.Payload, (shard, meta) => {
  logger.debug("gateway payload", { shard, meta });
});

gateway.on(GatewayDispatchEvents.GuildCreate, ({ shard, event }) => {
  logger.info("gateway guild_create", { shard, event });
});

gateway.on(GatewayDispatchEvents.GuildDelete, ({ shard, event }) => {
  logger.info("gateway guild_delete", { shard, event });
});

gateway.on(GatewayDispatchEvents.Ready, () => {
  const data: GatewayUpdatePresence = {
    op: GatewayOpcodes.PresenceUpdate,
    d: {
      since: Date.now(),
      activities: [
        {
          name: "🫖 Teapot Simulator",
          state: "Autour du cou de Lila",
          type: ActivityType.Playing,
        },
      ],
      status: PresenceUpdateStatus.Online,
      afk: false,
    },
  };
  gateway.send(data);
});
