import { Routes } from 'discord-api-types/v10';
import type { Request } from 'express';
import { logger } from '../logger.js';
import { discordapi } from './discordapi.js';

/** Drop the ephemeral select menu after a public confirmation response. */
export const dismissEphemeralSelect = (req: Request) => {
  const applicationId = req.body.application_id as string | undefined;
  const token = req.body.token as string | undefined;
  const messageId = req.body.message?.id as string | undefined;
  if (!applicationId || !token || !messageId) {
    return;
  }
  void discordapi
    .delete(Routes.webhookMessage(applicationId, token, messageId))
    .catch((error) => {
      logger.error(error);
    });
};
