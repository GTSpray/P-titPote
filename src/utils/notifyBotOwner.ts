import type { APIChannel } from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';

import { logger } from '../logger.js';
import { discordapi } from './discordapi.js';

export async function notifyBotOwner(content: string): Promise<void> {
  const ownerId = process.env.BOT_OWNER_ID;
  if (!ownerId) {
    logger.debug('notifyBotOwner skipped', { reason: 'no BOT_OWNER_ID' });
    return;
  }

  try {
    const channel = (await discordapi.post(Routes.userChannels(), {
      body: { recipient_id: ownerId },
    })) as APIChannel;

    await discordapi.post(Routes.channelMessages(channel.id), {
      body: { content },
    });
  } catch (err) {
    logger.error('notifyBotOwner failed', { err });
  }
}
