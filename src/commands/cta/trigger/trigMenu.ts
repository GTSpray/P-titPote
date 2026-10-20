import * as z from 'zod';
import { ComponentType } from 'discord-api-types/v10';
import { CTASelectData, ModalHandlerDelcaration } from '../../modals.js';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { updateMessagePayload } from '../../commonMessages.js';
import { t, type TranslationKey } from '../../../i18n/index.js';
import { GuildTriggerKind } from '../../../trigger/GuildTriggerKind.js';
import { triggerKindLabel } from '../../../trigger/triggerKindLabel.js';
import { triggerSelectOptions } from './triggerSelectOptions.js';

const ValidTriggerMenu = z.object({
  action: z.enum(['create', 'update', 'enable', 'disable', 'delete']),
});

type TriggerMenuAction = z.infer<typeof ValidTriggerMenu>['action'];

const actionLabelKey: Record<TriggerMenuAction, TranslationKey> = {
  create: 'trigger.action.create',
  update: 'trigger.action.update',
  enable: 'trigger.action.enable',
  disable: 'trigger.action.disable',
  delete: 'trigger.action.delete',
};

const selectedContent = (action: TriggerMenuAction, next: string) =>
  t('trigger.menu.selectedChoice', {
    choice: t(actionLabelKey[action]),
    next,
  });

export const trigMenu: ModalHandlerDelcaration<CTASelectData> = {
  async handler({ req, res, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(updateMessagePayload(t('common.notAllowed')));
    }

    const guildId = req.body.guild_id;
    const parsed = ValidTriggerMenu.safeParse({
      action: req.body.data?.values?.[0],
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

    const { action } = parsed.data;

    switch (action) {
      case 'create':
        return res.json(
          updateMessagePayload(
            selectedContent('create', t('trigger.create.chooseKind')),
            [
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: JSON.stringify({
                      t: 'cta',
                      d: { a: 'trigSetType' },
                    }),
                    placeholder: t('trigger.modal.select.kind.placeholder'),
                    options: [
                      {
                        label: triggerKindLabel(
                          GuildTriggerKind.WelcomeMessage,
                        ),
                        value: GuildTriggerKind.WelcomeMessage,
                      },
                      {
                        label: triggerKindLabel(GuildTriggerKind.WelcomeRole),
                        value: GuildTriggerKind.WelcomeRole,
                      },
                    ],
                  },
                ],
              },
            ],
          ),
        );

      case 'update':
      case 'enable':
      case 'disable':
      case 'delete': {
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
          return res.json(
            updateMessagePayload(selectedContent(action, t('common.notFound'))),
          );
        }

        const nextKey: TranslationKey =
          action === 'update'
            ? 'trigger.update.chooseTrigger'
            : 'trigger.lifecycle.chooseTrigger';

        return res.json(
          updateMessagePayload(selectedContent(action, t(nextKey)), [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.StringSelect,
                  custom_id: JSON.stringify({
                    t: 'cta',
                    d: { a: 'trigPick', act: action },
                  }),
                  placeholder: t('trigger.modal.select.trigger.placeholder'),
                  options: triggerSelectOptions(triggers),
                },
              ],
            },
          ]),
        );
      }
    }
  },
};
