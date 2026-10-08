import {
  Routes,
  type GatewayGuildMemberAddDispatchData,
  type RESTGetAPIGuildResult,
} from 'discord-api-types/v10';
import type { EntityManager } from '@mikro-orm/core';
import { GuildTrigger } from '../db/entities/GuildTrigger.entity.js';
import { discordapi } from '../utils/discordapi.js';
import { interpolateTriggerMessage } from '../utils/interpolateTriggerMessage.js';
import { logger } from '../logger.js';

export const runGuildTriggers = async (
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

  for (const trigger of triggers) {
    try {
      if (trigger.kind === 'welcome_role' && trigger.roleConfig?.roleId) {
        await discordapi.put(
          Routes.guildMemberRole(guildId, userId, trigger.roleConfig.roleId),
        );
        continue;
      }

      if (
        trigger.kind === 'welcome_message' &&
        trigger.messageConfig?.channelId &&
        trigger.messageConfig.message
      ) {
        const content = interpolateTriggerMessage(
          trigger.messageConfig.message,
          {
            userId,
            username,
            serverName,
          },
        );
        await discordapi.post(
          Routes.channelMessages(trigger.messageConfig.channelId),
          {
            body: { content },
          },
        );
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
