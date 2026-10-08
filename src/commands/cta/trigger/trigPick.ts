import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  Routes,
  SelectMenuDefaultValueType,
  TextInputStyle,
} from 'discord-api-types/v10';
import type { Request, Response } from 'express';
import { CTASelectData, ModalHandlerDelcaration } from '../../modals.js';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { updateMessagePayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { triggerNameSchema } from '../../../utils/triggerName.js';
import { discordapi } from '../../../utils/discordapi.js';

const ValidTriggerPick = z.object({
  act: z.enum(['update', 'enable', 'disable', 'delete']),
  name: triggerNameSchema,
});

/** Public channel confirmation (not ephemeral). */
const okPublic = (content: string) => ({
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

/** Drop the ephemeral select menu after a public confirmation response. */
const dismissEphemeralSelect = (req: Request) => {
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

const respondPublicOk = (req: Request, res: Response, content: string) => {
  const response = res.json(okPublic(content));
  dismissEphemeralSelect(req);
  return response;
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

    const em = dbServices.orm.em.fork();
    const trigger = await em.findOne(
      GuildTrigger,
      {
        server: { guildId },
        name: parsed.data.name,
      },
      { populate: ['messageConfig', 'roleConfig'] },
    );

    if (!trigger) {
      return res.json(
        updateMessagePayload(
          t('trigger.lifecycle.notFound', { name: parsed.data.name }),
        ),
      );
    }

    if (parsed.data.act === 'update') {
      if (trigger.kind === 'welcome_message') {
        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: JSON.stringify({
              t: 'cta',
              d: { a: 'trigSetWelMsg', n: trigger.name },
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
      }

      return res.json({
        type: InteractionResponseType.Modal,
        data: {
          custom_id: JSON.stringify({
            t: 'cta',
            d: { a: 'trigSetWelRole', n: trigger.name },
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
    }

    if (parsed.data.act === 'enable') {
      if (trigger.enabled) {
        return res.json(
          updateMessagePayload(
            t('trigger.lifecycle.alreadyEnabled', {
              name: parsed.data.name,
            }),
          ),
        );
      }
      trigger.enabled = true;
      await em.persist(trigger).flush();
      return respondPublicOk(
        req,
        res,
        t('trigger.lifecycle.enabled', { name: parsed.data.name }),
      );
    }

    if (parsed.data.act === 'disable') {
      if (!trigger.enabled) {
        return res.json(
          updateMessagePayload(
            t('trigger.lifecycle.alreadyDisabled', {
              name: parsed.data.name,
            }),
          ),
        );
      }
      trigger.enabled = false;
      await em.persist(trigger).flush();
      return respondPublicOk(
        req,
        res,
        t('trigger.lifecycle.disabled', { name: parsed.data.name }),
      );
    }

    trigger.deletedAt = new Date();
    await em.persist(trigger).flush();
    return respondPublicOk(
      req,
      res,
      t('trigger.lifecycle.deleted', { name: parsed.data.name }),
    );
  },
};
