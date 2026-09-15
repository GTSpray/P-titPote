import { Response } from 'express';
import { CommandHandlerOptions, SubCommandOption } from '../../commands.js';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import { logger } from '../../../logger.js';
import { errorPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { isThreadChannel } from '../../../utils/isThreadChannel.js';
import {
  REMIND_DAYS_MAX,
  REMIND_DAYS_MIN,
} from '../../../utils/remindConstants.js';
import { findOrCreateGuild } from '../../../db/services/discordGuild.service.js';
import { ThreadRemind } from '../../../db/entities/ThreadRemind.entity.js';
import { getOptionValue } from '../../options.js';
import * as z from 'zod';

export interface remindOnCommandData {
  id: string;
  name: string;
  options: [remindOnSubCommandData];
  type: number;
}

export type remindOnSubCommandData = {
  name: 'on';
  options: [SubCommandOption<'days', number>];
  type: number;
};

const DaysSchema = z.number().int().min(REMIND_DAYS_MIN).max(REMIND_DAYS_MAX);

export const on = async (
  { req, res, dbServices }: CommandHandlerOptions<remindOnCommandData>,
  subcommand: remindOnSubCommandData,
): Promise<Response | null> => {
  if (!isThreadChannel(req.body.channel)) {
    return res.json(errorPayload(t('remind.on.notThread')));
  }

  const daysRaw = getOptionValue<number>(subcommand.options, 'days');
  const daysParsed = DaysSchema.safeParse(daysRaw);
  if (!daysParsed.success) {
    logger.debug('zod errors', { issues: daysParsed.error.issues });
    return res.status(400).json({
      error: t('errors.invalidSubcommandPayload'),
      issues: daysParsed.error.issues,
    });
  }
  const idleDays = daysParsed.data;

  const guildId = req.body.guild_id;
  const threadId = req.body.channel?.id;
  const ownerUserId = req.body.member?.user?.id ?? req.body.user?.id;

  if (!guildId || !threadId || !ownerUserId || !dbServices) {
    return res.status(500).json({ error: t('errors.invalid') });
  }

  const em = dbServices.orm.em.fork();
  const existing = await em.findOne(ThreadRemind, { threadId });
  if (existing) {
    return res.json(errorPayload(t('remind.on.alreadyExists')));
  }

  const guild = await findOrCreateGuild(em, guildId);
  const remind = new ThreadRemind(threadId, ownerUserId, idleDays);
  remind.server = guild;
  await em.persist(remind).flush();

  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: t('remind.on.success', { days: idleDays }),
    },
  });
};
