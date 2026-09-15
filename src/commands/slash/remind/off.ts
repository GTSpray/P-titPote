import { Response } from 'express';
import { CommandHandlerOptions } from '../../commands.js';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import { logger } from '../../../logger.js';
import {
  errorPayload,
  notAllowed,
  notFoundPayload,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { isThreadChannel } from '../../../utils/isThreadChannel.js';
import { ThreadRemind } from '../../../db/entities/ThreadRemind.entity.js';
import { assertInteractionUserIsOwnerOrModerator } from '../../assert/assertInteractionUserIsOwnerOrModerator.js';

export interface remindOffCommandData {
  id: string;
  name: string;
  options: [remindOffSubCommandData];
  type: number;
}

export type remindOffSubCommandData = {
  name: 'off';
  options?: [];
  type: number;
};

export const off = async ({
  req,
  res,
  dbServices,
}: CommandHandlerOptions<remindOffCommandData>): Promise<Response | null> => {
  if (!isThreadChannel(req.body.channel)) {
    return res.json(errorPayload(t('remind.on.notThread')));
  }

  const threadId = req.body.channel?.id;
  if (!threadId || !dbServices) {
    return res.status(500).json({ error: t('errors.invalid') });
  }

  const em = dbServices.orm.em.fork();
  const remind = await em.findOne(ThreadRemind, { threadId });
  if (!remind) {
    return res.json(notFoundPayload());
  }

  try {
    assertInteractionUserIsOwnerOrModerator(req.body, remind.ownerUserId);
  } catch (error) {
    logger.error(error);
    return res.json(notAllowed());
  }

  remind.deletedAt = new Date();
  await em.persist(remind).flush();

  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: t('remind.off.success'),
    },
  });
};
