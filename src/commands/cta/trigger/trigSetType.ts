import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import type { Response } from 'express';
import type { CTASelectData, ModalHandlerDelcaration } from '../../modals.js';
import { logger } from '../../../logger.js';
import {
  assertInteractionUserCanManageRoles,
  assertInteractionUserIsModerator,
} from '../../assert/assertInteractionUserIsModerator.js';
import { updateMessagePayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { GuildTriggerKind } from '../../../db/entities/GuildTrigger.entity.js';

const ValidTriggerKind = z.object({
  kind: z.enum([GuildTriggerKind.WelcomeMessage, GuildTriggerKind.WelcomeRole]),
});

const nameLabel = () => ({
  type: ComponentType.Label,
  label: t('trigger.modal.label.name'),
  description: t('trigger.modal.description.name'),
  component: {
    type: ComponentType.TextInput,
    custom_id: 'name',
    style: TextInputStyle.Short,
    min_length: 1,
    max_length: 50,
    required: true,
  },
});

const welcomeMessageCreateModal = () => ({
  type: InteractionResponseType.Modal,
  data: {
    custom_id: JSON.stringify({
      t: 'cta',
      d: { a: 'trigCreateWelMsg' },
    }),
    title: t('trigger.modal.config.welcome_message.title'),
    components: [
      nameLabel(),
      {
        type: ComponentType.Label,
        label: t('trigger.modal.label.channel'),
        component: {
          type: ComponentType.ChannelSelect,
          custom_id: 'channel',
          required: true,
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
        },
      },
    ],
  },
});

const welcomeRoleCreateModal = () => ({
  type: InteractionResponseType.Modal,
  data: {
    custom_id: JSON.stringify({
      t: 'cta',
      d: { a: 'trigCreateWelRole' },
    }),
    title: t('trigger.modal.config.welcome_role.title'),
    components: [
      nameLabel(),
      {
        type: ComponentType.Label,
        label: t('trigger.modal.label.role'),
        component: {
          type: ComponentType.RoleSelect,
          custom_id: 'role',
          required: true,
        },
      },
    ],
  },
});

export const trigSetType: ModalHandlerDelcaration<CTASelectData> = {
  async handler({ req, res }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(updateMessagePayload(t('common.notAllowed')));
    }

    const guildId = req.body.guild_id;
    const parsed = ValidTriggerKind.safeParse({
      kind: req.body.data?.values?.[0],
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    if (!guildId) {
      return res.status(500).json({
        error: t('errors.unmetResult'),
      });
    }

    let resp: Response;
    switch (parsed.data.kind) {
      case GuildTriggerKind.WelcomeMessage:
        resp = res.json(welcomeMessageCreateModal());
        break;
      case GuildTriggerKind.WelcomeRole:
        try {
          assertInteractionUserCanManageRoles(req.body);
        } catch (error) {
          logger.error(error);
          return res.json(updateMessagePayload(t('common.notAllowed')));
        }
        resp = res.json(welcomeRoleCreateModal());
        break;
      default:
        resp = res.status(500).json({
          error: t('errors.unmetResult'),
        });
    }

    return resp;
  },
};
