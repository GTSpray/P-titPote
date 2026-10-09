import 'dotenv/config';
import { gateway } from './gateway/index.js';
import {
  ActivityType,
  GatewayDispatchEvents,
  GatewayOpcodes,
  GatewayUpdatePresence,
  InteractionType,
  PresenceUpdateStatus,
  Routes,
} from 'discord-api-types/v10';
import { logger } from './logger.js';
import { GWSEvent } from './gateway/gatewaytypes.js';
import { discordapi } from './utils/discordapi.js';
import { notifyBotOwner } from './utils/notifyBotOwner.js';
import { t } from './i18n/index.js';
import config from './mikro-orm.config.js';
import { initORM } from './db/db.js';
import { findOrCreateGuild } from './db/services/discordGuild.service.js';

const dbServices = initORM(config, false);

gateway.on(GWSEvent.Debug, (shard, debugmsg, meta?) => {
  logger.debug('gateway', { shard, debugmsg, meta });
});

gateway.on(GWSEvent.Payload, (shard, meta) => {
  logger.debug('gateway payload', { shard, meta });
});

gateway.on(GatewayDispatchEvents.GuildCreate, ({ shard, event }) => {
  void (async () => {
    const guildId = event.id;
    try {
      const { orm } = await dbServices;
      const em = orm.em.fork();
      await findOrCreateGuild(em, guildId);
      await em.flush();
      logger.info('gateway guild_create persisted', { shard, guildId });
    } catch (err) {
      logger.error('gateway guild_create persist failed', {
        shard,
        guildId,
        err,
      });
    }
  })();
});

gateway.on(GatewayDispatchEvents.GuildDelete, ({ shard, event }) => {
  logger.info('gateway guild_delete', { shard, event });
});

gateway.on(GatewayDispatchEvents.MessageCreate, ({ event }) => {
  void (async () => {
    try {
      const metadata = event.interaction_metadata;
      if (metadata?.type === InteractionType.ApplicationCommand) {
        const name = (metadata as any).name;
        if (name === 'gimme version') {
          await discordapi.put(
            Routes.channelMessageOwnReaction(event.channel_id, event.id, '👀'),
          );
        }
      }
    } catch (err) {
      logger.error('gateway message_create handler failed', { err });
    }
  })();
});

gateway.on(GatewayDispatchEvents.MessageReactionAdd, ({ event }) => {
  void (async () => {
    try {
      // Only bounce 👀 on bot-authored messages (version replies get the bot's 👀).
      if (event.message_author_id !== process.env.APP_ID) {
        return;
      }
      if (event.user_id === process.env.APP_ID) {
        return;
      }
      if (event.emoji.name === '👀') {
        await discordapi.delete(
          Routes.channelMessageUserReaction(
            event.channel_id,
            event.message_id,
            event.emoji.name,
            event.user_id,
          ),
        );
      }
    } catch (err) {
      logger.error('gateway message_reaction_add handler failed', { err });
    }
  })();
});

gateway.on(GatewayDispatchEvents.Ready, () => {
  const data: GatewayUpdatePresence = {
    op: GatewayOpcodes.PresenceUpdate,
    d: {
      since: Date.now(),
      activities: [
        {
          name: t('gateway.activity.name'),
          state: t('gateway.activity.state'),
          type: ActivityType.Playing,
        },
      ],
      status: PresenceUpdateStatus.Online,
      afk: false,
    },
  };
  gateway.send(data);
});

gateway.once(GatewayDispatchEvents.Ready, () => {
  void notifyBotOwner(
    t('startup.dm.gateway', {
      version: process.env.npm_package_version ?? 'unknown',
    }),
  );
});

dbServices
  .then(() => gateway.connect())
  .then(() => {
    logger.debug('gateway connected');
  })
  .catch((err) => {
    logger.error('gateway error', { err });
  });
