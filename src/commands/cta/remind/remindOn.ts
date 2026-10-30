import * as z from 'zod';
import type { Response } from 'express';
import {
  type ComponentSimple,
  type CTAData,
  getInputComponnentById,
  type ModalHandlerDelcaration,
} from '../../modals.js';
import { logger } from '../../../logger.js';
import { updateMessagePayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  isArchivedThreadChannel,
  isThreadChannel,
} from '../../../utils/isThreadChannel.js';
import {
  REMIND_DAYS_MAX,
  REMIND_DAYS_MIN,
} from '../../../shared/remind/constants.js';
import { findOrCreateGuild } from '../../../db/services/discordGuild.service.js';
import { ThreadRemind } from '../../../db/entities/ThreadRemind.entity.js';

const DaysSchema = z.number().int().min(REMIND_DAYS_MIN).max(REMIND_DAYS_MAX);

const parseIdleDays = (raw: string | undefined): number | null => {
  if (raw == null || !/^\d{1,2}$/.test(raw.trim())) {
    return null;
  }
  const parsed = DaysSchema.safeParse(Number(raw.trim()));
  return parsed.success ? parsed.data : null;
};

const invalidContext = (res: Response) =>
  res.status(500).json({ error: t('errors.invalid') });

export const remindOn: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices }) {
    if (!isThreadChannel(req.body.channel)) {
      return res.json(updateMessagePayload(t('remind.on.notThread')));
    }

    if (isArchivedThreadChannel(req.body.channel)) {
      return res.json(updateMessagePayload(t('remind.on.archived')));
    }

    const daysRaw = getInputComponnentById<ComponentSimple>(
      req.body.data,
      'days',
    )?.component.value;
    const idleDays = parseIdleDays(daysRaw);
    if (idleDays == null) {
      logger.debug('remind days invalid', { daysRaw });
      return res.json(updateMessagePayload(t('remind.days.invalid')));
    }

    const guildId = req.body.guild_id;
    const threadId = req.body.channel?.id;
    const ownerUserId = req.body.member?.user?.id ?? req.body.user?.id;

    if (!guildId || !threadId || !ownerUserId || !dbServices) {
      return invalidContext(res);
    }

    const em = dbServices.orm.em.fork();
    const existing = await em.findOne(ThreadRemind, { threadId });
    if (existing) {
      return res.json(updateMessagePayload(t('remind.on.alreadyExists')));
    }

    const guild = await findOrCreateGuild(em, guildId);
    const remind = new ThreadRemind(threadId, ownerUserId, idleDays);
    remind.server = guild;
    await em.persist(remind).flush();

    return res.json(
      updateMessagePayload(t('remind.on.success', { days: idleDays })),
    );
  },
};
