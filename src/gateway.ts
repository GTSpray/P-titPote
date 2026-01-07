import "dotenv/config";
import { gateway } from "./gateway/index.js";
import {
  ActivityType,
  GatewayDispatchEvents,
  GatewayOpcodes,
  GatewayUpdatePresence,
  PresenceUpdateStatus,
  Routes,
} from "discord.js";
import { logger } from "./logger.js";
import { GWSEvent } from "./gateway/gatewaytypes.js";
import { InteractionType } from "discord.js";
import { discordapi } from "./utils/discordapi.js";

gateway.on(GatewayDispatchEvents.MessageReactionAdd, ({ event }) => {
  const { emoji, user_id } = event;
  logger.info("emoji recat", { user_id, emoji });
});

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

gateway.on(GatewayDispatchEvents.MessageCreate, async ({ event }) => {
  const metadata = event.interaction_metadata;
  if (metadata?.type === InteractionType.ApplicationCommand) {
    const name = (metadata as any).name;
    if (name === "poll c") {
      await discordapi.put(
        Routes.channelMessageOwnReaction(event.channel_id, event.id, "✉️"),
      );
    }
  }
});

gateway.on(GatewayDispatchEvents.MessageReactionAdd, async ({ event }) => {
  if (event.member?.user.id !== process.env.APP_ID) {
    if (event.emoji.name === "✉️") {
      await discordapi.delete(
        Routes.channelMessageUserReaction(
          event.channel_id,
          event.message_id,
          event.emoji.name,
          event.user_id,
        ),
      );
    }
  }
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

gateway
  .connect()
  .then(() => {
    logger.debug("gateway connected");
  })
  .catch((err) => {
    logger.error("gateway error", { err });
  });
