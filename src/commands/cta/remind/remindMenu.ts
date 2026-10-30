import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import type { Response } from 'express';
import type { EntityManager } from '@mikro-orm/core';
import type { Request } from 'express';
import type { CTASelectData, ModalHandlerDelcaration } from '../../modals.js';
import { logger } from '../../../logger.js';
import { updateMessagePayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  isArchivedThreadChannel,
  isThreadChannel,
} from '../../../utils/isThreadChannel.js';
import { ThreadRemind } from '../../../db/entities/ThreadRemind.entity.js';
import { assertInteractionUserIsOwnerOrModerator } from '../../assert/assertInteractionUserIsOwnerOrModerator.js';
import { deleteRemindBumpMessage } from '../../../shared/remind/deleteRemindBumpMessage.js';

const ValidRemindMenu = z.object({
  action: z.enum(['on', 'status', 'off']),
});

const unmetResult = (res: Response) =>
  res.status(500).json({
    error: t('errors.unmetResult'),
  });

export const remindDaysModal = () => ({
  type: InteractionResponseType.Modal,
  data: {
    custom_id: JSON.stringify({
      t: 'cta',
      d: { a: 'remindOn' },
    }),
    title: t('remind.modal.days.title'),
    components: [
      {
        type: ComponentType.Label,
        label: t('remind.modal.days.label'),
        description: t('remind.modal.days.description'),
        component: {
          type: ComponentType.TextInput,
          custom_id: 'days',
          style: TextInputStyle.Short,
          min_length: 1,
          max_length: 2,
          required: true,
        },
      },
    ],
  },
});

const handleOn = async (
  req: Request,
  res: Response,
  em: EntityManager,
  threadId: string,
) => {
  if (isArchivedThreadChannel(req.body.channel)) {
    return res.json(updateMessagePayload(t('remind.on.archived')));
  }

  const existing = await em.findOne(ThreadRemind, { threadId });
  if (existing) {
    return res.json(updateMessagePayload(t('remind.on.alreadyExists')));
  }

  return res.json(remindDaysModal());
};

const handleStatus = async (
  res: Response,
  em: EntityManager,
  threadId: string,
) => {
  const remind = await em.findOne(ThreadRemind, { threadId });
  if (!remind) {
    return res.json(updateMessagePayload(t('remind.status.inactive')));
  }

  return res.json(
    updateMessagePayload(
      t('remind.status.active', {
        days: remind.idleDays,
        ownerId: remind.ownerUserId,
      }),
    ),
  );
};

const handleOff = async (
  req: Request,
  res: Response,
  em: EntityManager,
  threadId: string,
) => {
  const remind = await em.findOne(ThreadRemind, { threadId });
  if (!remind) {
    return res.json(updateMessagePayload(t('common.notFound')));
  }

  try {
    assertInteractionUserIsOwnerOrModerator(req.body, remind.ownerUserId);
  } catch (error) {
    logger.error(error);
    return res.json(updateMessagePayload(t('common.notAllowed')));
  }

  await deleteRemindBumpMessage(remind);
  remind.deletedAt = new Date();
  await em.persist(remind).flush();

  return res.json(updateMessagePayload(t('remind.off.success')));
};

export const remindMenu: ModalHandlerDelcaration<CTASelectData> = {
  async handler({ req, res, dbServices }) {
    if (!isThreadChannel(req.body.channel)) {
      return res.json(updateMessagePayload(t('remind.on.notThread')));
    }

    const parsed = ValidRemindMenu.safeParse({
      action: req.body.data?.values?.[0],
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    const threadId = req.body.channel?.id;
    if (!threadId || !dbServices) {
      return unmetResult(res);
    }

    const em = dbServices.orm.em.fork();
    const { action } = parsed.data;

    switch (action) {
      case 'on':
        return handleOn(req, res, em, threadId);
      case 'status':
        return handleStatus(res, em, threadId);
      case 'off':
        return handleOff(req, res, em, threadId);
      default:
        return unmetResult(res);
    }
  },
};
