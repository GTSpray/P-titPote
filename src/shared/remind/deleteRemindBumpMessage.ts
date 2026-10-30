import { Routes } from 'discord-api-types/v10';
import type { ThreadRemind } from '../../db/entities/ThreadRemind.entity.js';
import { discordapi } from '../../utils/discordapi.js';
import { logger } from '../../logger.js';
import { isDiscordNotFound } from '../../utils/isDiscordNotFound.js';

export async function deleteRemindBumpMessage(
  remind: ThreadRemind,
): Promise<void> {
  if (!remind.lastBumpMessageId) {
    return;
  }

  try {
    await discordapi.delete(
      Routes.channelMessage(remind.threadId, remind.lastBumpMessageId),
    );
  } catch (error) {
    if (!isDiscordNotFound(error)) {
      logger.warn('remind previous bump delete failed', {
        threadId: remind.threadId,
        messageId: remind.lastBumpMessageId,
        error,
      });
    }
  }

  remind.lastBumpMessageId = null;
}
