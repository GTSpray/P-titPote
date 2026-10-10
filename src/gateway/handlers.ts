import {
  GatewayDispatchEvents,
  InteractionType,
  Routes,
  type GatewayMessageCreateDispatchData,
  type GatewayMessageReactionAddDispatchData,
} from 'discord-api-types/v10';
import { logger } from '../logger.js';
import { discordapi } from '../utils/discordapi.js';
import { notifyBotOwner } from '../utils/notifyBotOwner.js';
import { t } from '../i18n/index.js';
import type { DBServices } from '../db/db.js';
import { findOrCreateGuild } from '../db/services/discordGuild.service.js';
import type { GatewaySocket } from './GatewaySocket.js';
import { GWSEvent } from './gatewaytypes.js';

export const PROBE_COMMAND_NAME = 'gimme version';
export const PROBE_EMOJI = '👀';

/**
 * Discord documents the command name only on the deprecated `interaction`
 * object; `interaction_metadata` has no documented `name`, so both are read.
 */
export function getInteractionCommand(message: {
  interaction?: unknown;
  interaction_metadata?: unknown;
}): { type?: unknown; name?: string } {
  const legacy = message.interaction as
    { type?: unknown; name?: unknown } | undefined;
  const metadata = message.interaction_metadata as
    { type?: unknown; name?: unknown } | undefined;
  const name = [legacy?.name, metadata?.name].find(
    (n): n is string => typeof n === 'string',
  );
  return { type: metadata?.type ?? legacy?.type, name };
}

export async function handleMessageCreate(
  event: GatewayMessageCreateDispatchData,
): Promise<void> {
  try {
    const { type, name } = getInteractionCommand(event);
    if (
      type === InteractionType.ApplicationCommand &&
      name === PROBE_COMMAND_NAME
    ) {
      await discordapi.put(
        Routes.channelMessageOwnReaction(
          event.channel_id,
          event.id,
          PROBE_EMOJI,
        ),
      );
    }
  } catch (err) {
    logger.error('gateway message_create handler failed', { err });
  }
}

export async function handleMessageReactionAdd(
  event: GatewayMessageReactionAddDispatchData,
): Promise<void> {
  try {
    // Only bounce the probe emoji on bot-authored messages (version replies).
    if (event.message_author_id !== process.env.APP_ID) {
      return;
    }
    if (event.user_id === process.env.APP_ID) {
      return;
    }
    if (event.emoji.name === PROBE_EMOJI) {
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
}

export async function handleGuildCreate(
  dbServices: Promise<DBServices>,
  shard: number,
  guildId: string,
): Promise<void> {
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
}

export function registerGatewayHandlers(
  gateway: GatewaySocket,
  dbServices: Promise<DBServices>,
) {
  gateway.on(GWSEvent.Debug, (shard, debugmsg, meta?) => {
    logger.debug('gateway', { shard, debugmsg, meta });
  });

  gateway.on(GWSEvent.Payload, (shard, meta) => {
    logger.debug('gateway payload', { shard, meta });
  });

  gateway.on(GatewayDispatchEvents.GuildCreate, ({ shard, event }) => {
    void handleGuildCreate(dbServices, shard, event.id);
  });

  gateway.on(GatewayDispatchEvents.GuildDelete, ({ shard, event }) => {
    logger.info('gateway guild_delete', { shard, event });
  });

  gateway.on(GatewayDispatchEvents.MessageCreate, ({ event }) => {
    void handleMessageCreate(event);
  });

  gateway.on(GatewayDispatchEvents.MessageReactionAdd, ({ event }) => {
    void handleMessageReactionAdd(event);
  });

  gateway.once(GatewayDispatchEvents.Ready, () => {
    void notifyBotOwner(
      t('startup.dm.gateway', {
        version: process.env.npm_package_version ?? 'unknown',
      }),
    );
  });
}
