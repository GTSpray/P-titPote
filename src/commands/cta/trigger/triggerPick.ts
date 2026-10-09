import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  TextInputStyle,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { triggerNameSchema } from '../../../utils/triggerName.js';

const ValidTriggerPick = z.object({
  act: z.enum(['update', 'enable', 'disable', 'delete']),
  name: triggerNameSchema,
});

const okText = (content: string) => ({
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

export const triggerPick: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices, additionalData }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    const parsed = ValidTriggerPick.safeParse({
      act: (<any>additionalData).d?.act,
      name: (req.body.data as { values?: string[] } | undefined)?.values?.[0],
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
        errorPayload(
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
              d: { a: 'tUpdMsg', n: trigger.name },
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
            d: { a: 'tUpdRole', n: trigger.name },
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
              },
            },
          ],
        },
      });
    }

    if (parsed.data.act === 'enable') {
      if (trigger.enabled) {
        return res.json(
          errorPayload(
            t('trigger.lifecycle.alreadyEnabled', {
              name: parsed.data.name,
            }),
          ),
        );
      }
      trigger.enabled = true;
      await em.persist(trigger).flush();
      return res.json(
        okText(t('trigger.lifecycle.enabled', { name: parsed.data.name })),
      );
    }

    if (parsed.data.act === 'disable') {
      if (!trigger.enabled) {
        return res.json(
          errorPayload(
            t('trigger.lifecycle.alreadyDisabled', {
              name: parsed.data.name,
            }),
          ),
        );
      }
      trigger.enabled = false;
      await em.persist(trigger).flush();
      return res.json(
        okText(t('trigger.lifecycle.disabled', { name: parsed.data.name })),
      );
    }

    trigger.deletedAt = new Date();
    await em.persist(trigger).flush();
    return res.json(
      okText(t('trigger.lifecycle.deleted', { name: parsed.data.name })),
    );
  },
};
