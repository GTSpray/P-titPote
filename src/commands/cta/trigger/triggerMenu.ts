import * as z from 'zod';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { notAllowed, notFoundPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { triggerSelectOptions } from './triggerSelectOptions.js';

const ValidTriggerMenu = z.object({
  action: z.enum(['create', 'update', 'enable', 'disable', 'delete']),
});

export const triggerMenu: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    const parsed = ValidTriggerMenu.safeParse({
      action: (req.body.data as { values?: string[] } | undefined)?.values?.[0],
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

    if (parsed.data.action === 'create') {
      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: t('trigger.create.chooseKind'),
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.StringSelect,
                  custom_id: JSON.stringify({
                    t: 'cta',
                    d: { a: 'triggerSetType' },
                  }),
                  placeholder: t('trigger.modal.select.kind.placeholder'),
                  options: [
                    {
                      label: t('trigger.kind.welcome_message'),
                      value: 'welcome_message',
                    },
                    {
                      label: t('trigger.kind.welcome_role'),
                      value: 'welcome_role',
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
    }

    if (!dbServices) {
      return res.status(500).json({
        error: t('errors.unmetResult'),
      });
    }

    const em = dbServices.orm.em.fork();
    const triggers = await em.find(
      GuildTrigger,
      { server: { guildId } },
      { orderBy: { name: 'ASC' } },
    );

    if (triggers.length === 0) {
      return res.json(notFoundPayload());
    }

    const contentKey =
      parsed.data.action === 'update'
        ? 'trigger.update.chooseTrigger'
        : 'trigger.lifecycle.chooseTrigger';

    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t(contentKey),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'triggerPick', act: parsed.data.action },
                }),
                placeholder: t('trigger.modal.select.trigger.placeholder'),
                options: triggerSelectOptions(triggers),
              },
            ],
          },
        ],
      },
    });
  },
};
