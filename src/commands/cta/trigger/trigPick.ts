import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  SelectMenuDefaultValueType,
  TextInputStyle,
} from 'discord-api-types/v10';
import type { EntityManager } from '@mikro-orm/core';
import type { Request, Response } from 'express';
import { CTASelectData, ModalHandlerDelcaration } from '../../modals.js';
import {
  GuildTrigger,
  GuildTriggerKind,
} from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { updateMessagePayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { triggerNameSchema } from '../../../trigger/triggerName.js';
import { dismissEphemeralSelect } from '../../../utils/dismissEphemeralSelect.js';

const ValidTriggerPick = z.object({
  act: z.enum(['update', 'enable', 'disable', 'delete']),
  name: triggerNameSchema,
});

const respondPublicOk = (req: Request, res: Response, content: string) => {
  const response = res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.TextDisplay,
          content,
        },
      ],
    },
  });
  dismissEphemeralSelect(req);
  return response;
};

const welcomeMessageUpdateModal = (trigger: GuildTrigger) => ({
  type: InteractionResponseType.Modal,
  data: {
    custom_id: JSON.stringify({
      t: 'cta',
      d: { a: 'trigUpdateWelMsg', n: trigger.name },
    }),
    title: t('trigger.modal.config.welcome_message.title'),
    components: [
      {
        type: ComponentType.Label,
        label: t('trigger.modal.label.channel'),
        component: {
          type: ComponentType.ChannelSelect,
          custom_id: 'channel',
          required: true,
          ...(trigger.messageConfig?.channelId
            ? {
                default_values: [
                  {
                    id: trigger.messageConfig.channelId,
                    type: SelectMenuDefaultValueType.Channel,
                  },
                ],
              }
            : {}),
        },
      },
      {
        type: ComponentType.Label,
        label: t('trigger.modal.label.message'),
        description: t('trigger.modal.description.message'),
        component: {
          type: ComponentType.TextInput,
          custom_id: 'message',
          style: TextInputStyle.Paragraph,
          min_length: 1,
          max_length: 2000,
          required: true,
          value: trigger.messageConfig?.message?.slice(0, 2000),
        },
      },
    ],
  },
});

const welcomeRoleUpdateModal = (trigger: GuildTrigger) => ({
  type: InteractionResponseType.Modal,
  data: {
    custom_id: JSON.stringify({
      t: 'cta',
      d: { a: 'trigUpdateWelRole', n: trigger.name },
    }),
    title: t('trigger.modal.config.welcome_role.title'),
    components: [
      {
        type: ComponentType.Label,
        label: t('trigger.modal.label.role'),
        component: {
          type: ComponentType.RoleSelect,
          custom_id: 'role',
          required: true,
          ...(trigger.roleConfig?.roleId
            ? {
                default_values: [
                  {
                    id: trigger.roleConfig.roleId,
                    type: SelectMenuDefaultValueType.Role,
                  },
                ],
              }
            : {}),
        },
      },
    ],
  },
});

const handleUpdate = (res: Response, trigger: GuildTrigger) => {
  if (trigger.kind === GuildTriggerKind.WelcomeMessage) {
    return res.json(welcomeMessageUpdateModal(trigger));
  }
  return res.json(welcomeRoleUpdateModal(trigger));
};

const handleEnable = async (
  req: Request,
  res: Response,
  em: EntityManager,
  trigger: GuildTrigger,
  name: string,
) => {
  if (trigger.enabled) {
    return res.json(
      updateMessagePayload(t('trigger.lifecycle.alreadyEnabled', { name })),
    );
  }
  trigger.enabled = true;
  await em.persist(trigger).flush();
  return respondPublicOk(req, res, t('trigger.lifecycle.enabled', { name }));
};

const handleDisable = async (
  req: Request,
  res: Response,
  em: EntityManager,
  trigger: GuildTrigger,
  name: string,
) => {
  if (!trigger.enabled) {
    return res.json(
      updateMessagePayload(t('trigger.lifecycle.alreadyDisabled', { name })),
    );
  }
  trigger.enabled = false;
  await em.persist(trigger).flush();
  return respondPublicOk(req, res, t('trigger.lifecycle.disabled', { name }));
};

const handleDelete = async (
  req: Request,
  res: Response,
  em: EntityManager,
  trigger: GuildTrigger,
  name: string,
) => {
  trigger.deletedAt = new Date();
  await em.persist(trigger).flush();
  return respondPublicOk(req, res, t('trigger.lifecycle.deleted', { name }));
};

export const trigPick: ModalHandlerDelcaration<CTASelectData> = {
  async handler({ req, res, dbServices, additionalData }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(updateMessagePayload(t('common.notAllowed')));
    }

    const guildId = req.body.guild_id;
    const parsed = ValidTriggerPick.safeParse({
      act: (<any>additionalData).d?.act,
      name: req.body.data?.values?.[0],
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    if (!dbServices || !guildId) {
      return res.status(500).json({
        error: t('errors.unmetResult'),
      });
    }

    const { act, name } = parsed.data;

    const em = dbServices.orm.em.fork();
    const trigger = await em.findOne(
      GuildTrigger,
      {
        server: { guildId },
        name,
      },
      { populate: ['messageConfig', 'roleConfig'] },
    );

    if (!trigger) {
      return res.json(
        updateMessagePayload(t('trigger.lifecycle.notFound', { name })),
      );
    }

    let rep: Response;
    switch (act) {
      case 'update':
        rep = handleUpdate(res, trigger);
        break;
      case 'enable':
        rep = await handleEnable(req, res, em, trigger, name);
        break;
      case 'disable':
        rep = await handleDisable(req, res, em, trigger, name);
        break;
      case 'delete':
        rep = await handleDelete(req, res, em, trigger, name);
        break;
      default:
        rep = res.status(500).json({
          error: t('errors.unmetResult'),
        });
        break;
    }

    return rep;
  },
};
