import type { EntityManager } from '@mikro-orm/core';
import {
  Routes,
  type APIMessage,
  type APIThreadChannel,
} from 'discord-api-types/v10';
import { ThreadRemind } from '../db/entities/ThreadRemind.entity.js';
import { discordapi } from './discordapi.js';
import { logger } from '../logger.js';
import { t } from '../i18n/index.js';
import { isOlderThanIdleDays, REMIND_INTERVAL_MS } from './remindConstants.js';

export { REMIND_INTERVAL_MS };

function isDiscordNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error as { status?: number; code?: number };
  if (err.status === 404) {
    return true;
  }
  return [10003, 10004, 10007].includes(err.code ?? -1);
}

async function isBotInGuild(guildId: string): Promise<boolean> {
  try {
    await discordapi.get(Routes.userGuildMember(guildId));
    return true;
  } catch (error) {
    if (isDiscordNotFound(error)) {
      return false;
    }
    throw error;
  }
}

function softDeleteRemind(remind: ThreadRemind): void {
  remind.deletedAt = new Date();
}

async function processThreadRemind(
  em: EntityManager,
  remind: ThreadRemind,
  now: Date,
): Promise<void> {
  try {
    const messages = (await discordapi.get(
      Routes.channelMessages(remind.threadId),
      {
        query: new URLSearchParams({ limit: '1' }),
      },
    )) as APIMessage[];

    if (!messages.length) {
      softDeleteRemind(remind);
      await em.flush();
      logger.info('remind soft-deleted: no messages', {
        threadId: remind.threadId,
      });
      return;
    }

    const lastMessageAt = new Date(messages[0].timestamp);
    if (!isOlderThanIdleDays(lastMessageAt, remind.idleDays, now)) {
      return;
    }

    const channel = (await discordapi.get(
      Routes.channel(remind.threadId),
    )) as APIThreadChannel;

    if (channel.thread_metadata?.archived) {
      await discordapi.patch(Routes.channel(remind.threadId), {
        body: { archived: false },
      });
    }

    await discordapi.post(Routes.channelMessages(remind.threadId), {
      body: {
        content: t('remind.bump.message'),
        allowed_mentions: { parse: [] },
      },
    });
  } catch (error) {
    if (isDiscordNotFound(error)) {
      softDeleteRemind(remind);
      await em.flush();
      logger.info('remind soft-deleted: channel missing', {
        threadId: remind.threadId,
      });
      return;
    }
    logger.error('remind thread processing failed', {
      threadId: remind.threadId,
      error,
    });
  }
}

export async function runRemindTick(
  em: EntityManager,
  now: Date = new Date(),
): Promise<void> {
  const reminds = await em.find(
    ThreadRemind,
    {},
    {
      populate: ['server'],
    },
  );

  const byGuild = new Map<string, ThreadRemind[]>();
  for (const remind of reminds) {
    const guildId = remind.server.guildId;
    const batch = byGuild.get(guildId) ?? [];
    batch.push(remind);
    byGuild.set(guildId, batch);
  }

  for (const [guildId, batch] of byGuild) {
    try {
      const botPresent = await isBotInGuild(guildId);
      if (!botPresent) {
        for (const remind of batch) {
          softDeleteRemind(remind);
        }
        await em.flush();
        logger.info('remind soft-deleted: bot left guild', {
          guildId,
          count: batch.length,
        });
        continue;
      }

      for (const remind of batch) {
        await processThreadRemind(em, remind, now);
      }
    } catch (error) {
      logger.error('remind guild batch failed', { guildId, error });
    }
  }
}

export function startRemindLoop(getEm: () => EntityManager): NodeJS.Timeout {
  const tick = () => {
    void runRemindTick(getEm()).catch((error) => {
      logger.error('remind tick failed', { error });
    });
  };

  tick();
  return setInterval(tick, REMIND_INTERVAL_MS);
}
