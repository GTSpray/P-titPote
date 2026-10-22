import * as z from 'zod';
import { ComponentType } from 'discord-api-types/v10';
import type { Response } from 'express';
import { CTASelectData, ModalHandlerDelcaration } from '../../modals.js';
import type { DBServices } from '../../../db/db.js';
import {
  GuildTrigger,
  GuildTriggerKind,
} from '../../../db/entities/GuildTrigger.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { updateMessagePayload } from '../../commonMessages.js';
import { t, type TranslationKey } from '../../../i18n/index.js';
import { triggerKindLabel } from '../../../shared/trigger/triggerKindLabel.js';
import { triggerSelectOptions } from '../../../shared/trigger/triggerSelectOptions.js';

const ValidTriggerMenu = z.object({
  action: z.enum(['create', 'update', 'enable', 'disable', 'delete']),
});

type TriggerMenuAction = z.infer<typeof ValidTriggerMenu>['action'];
type TriggerPickAction = Exclude<TriggerMenuAction, 'create'>;

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

const unmetResult = (res: Response) =>
  res.status(500).json({
    error: t('errors.unmetResult'),
  });

const handleCreate = (res: Response) =>
  res.json(
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
                  label: triggerKindLabel(GuildTriggerKind.WelcomeMessage),
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

const handlePickTrigger = async (
  res: Response,
  dbServices: DBServices | undefined,
  guildId: string,
  action: TriggerPickAction,
) => {
  if (!dbServices) {
    return unmetResult(res);
  }

  const triggers = await dbServices.orm.em
    .fork()
    .find(GuildTrigger, { server: { guildId } }, { orderBy: { name: 'ASC' } });

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
};

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
      return unmetResult(res);
    }

    const { action } = parsed.data;

    let resp: Response;
    switch (action) {
      case 'create':
        resp = handleCreate(res);
        break;
      case 'update':
      case 'enable':
      case 'disable':
      case 'delete':
        resp = await handlePickTrigger(res, dbServices, guildId, action);
        break;
      default:
        resp = unmetResult(res);
    }

    return resp;
  },
};
