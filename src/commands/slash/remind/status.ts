import { Response } from 'express';
import { CommandHandlerOptions } from '../../commands.js';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import { errorPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { isThreadChannel } from '../../../utils/isThreadChannel.js';
import { ThreadRemind } from '../../../db/entities/ThreadRemind.entity.js';

export interface remindStatusCommandData {
  id: string;
  name: string;
  options: [remindStatusSubCommandData];
  type: number;
}

export type remindStatusSubCommandData = {
  name: 'status';
  options?: [];
  type: number;
};

export const status = async ({
  req,
  res,
  dbServices,
}: CommandHandlerOptions<remindStatusCommandData>): Promise<Response | null> => {
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
    return res.json(errorPayload(t('remind.status.inactive')));
  }

  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: t('remind.status.active', {
        days: remind.idleDays,
        ownerId: remind.ownerUserId,
      }),
    },
  });
};
