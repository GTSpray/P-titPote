import {
  Routes,
  type GatewayGuildMemberAddDispatchData,
  type RESTGetAPIGuildResult,
} from 'discord-api-types/v10';
import type { EntityManager } from '@mikro-orm/core';
import {
  GuildTrigger,
  GuildTriggerKind,
} from '../db/entities/GuildTrigger.entity.js';
import { discordapi } from '../utils/discordapi.js';
import { interpolateTriggerMessage } from '../shared/trigger/interpolateTriggerMessage.js';
import { logger } from '../logger.js';

type TriggerRunContext = {
  guildId: string;
  userId: string;
  username: string;
  serverName: string;
};

const runWelcomeRole = async (
  trigger: GuildTrigger,
  { guildId, userId }: TriggerRunContext,
): Promise<void> => {
  const roleId = trigger.roleConfig?.roleId;
  if (!roleId) {
    return;
  }
  await discordapi.put(Routes.guildMemberRole(guildId, userId, roleId));
};

const runWelcomeMessage = async (
  trigger: GuildTrigger,
  { userId, username, serverName }: TriggerRunContext,
): Promise<void> => {
  const channelId = trigger.messageConfig?.channelId;
  const message = trigger.messageConfig?.message;
  if (!channelId || !message) {
    return;
  }
  const content = interpolateTriggerMessage(message, {
    userId,
    username,
    serverName,
  });
  await discordapi.post(Routes.channelMessages(channelId), {
    body: { content },
  });
};

export const runMemberJoinTrigger = async (
  em: EntityManager,
  event: GatewayGuildMemberAddDispatchData,
): Promise<void> => {
  const guildId = event.guild_id;
  const userId = event.user.id;
  const username = event.user.username;

  const triggers = await em.find(
    GuildTrigger,
    {
      server: { guildId },
      kind: {
        $in: [GuildTriggerKind.WelcomeMessage, GuildTriggerKind.WelcomeRole],
      },
      enabled: true,
    },
    { populate: ['messageConfig', 'roleConfig'] },
  );

  if (triggers.length === 0) {
    return;
  }

  let serverName = guildId;
  try {
    const guild = (await discordapi.get(
      Routes.guild(guildId),
    )) as RESTGetAPIGuildResult;
    serverName = guild.name;
  } catch (err) {
    logger.error('trigger guild fetch failed', { guildId, err });
  }

  const context: TriggerRunContext = {
    guildId,
    userId,
    username,
    serverName,
  };

  for (const trigger of triggers) {
    try {
      switch (trigger.kind) {
        case GuildTriggerKind.WelcomeRole:
          await runWelcomeRole(trigger, context);
          break;
        case GuildTriggerKind.WelcomeMessage:
          await runWelcomeMessage(trigger, context);
          break;
      }
    } catch (err) {
      logger.error('trigger execution failed', {
        guildId,
        userId,
        triggerId: trigger.id,
        triggerName: trigger.name,
        kind: trigger.kind,
        err,
      });
    }
  }
};
