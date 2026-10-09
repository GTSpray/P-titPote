import { notFoundPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { ComponentType, InteractionResponseType } from 'discord-api-types/v10';
import { Response } from 'express';
import type { DBServices } from '../../../db/db.js';
import { MessageAliasedLister } from '../../../db/model/index.js';
import {
  ListAliasesQuery,
  ListAliasesQueryHandler,
} from '../../../domain/alias/listAliasesQuery.js';

export async function openAliasSelectModal({
  res,
  dbServices,
  guildId,
  ctaAction,
  title,
}: {
  res: Response;
  dbServices?: DBServices;
  guildId: string | undefined;
  ctaAction: 'aliasSay' | 'aliasRm';
  title: string;
}): Promise<Response | null> {
  if (!dbServices || !guildId) {
    return null;
  }

  const aliases = await new ListAliasesQueryHandler(
    MessageAliasedLister,
  ).handle(new ListAliasesQuery(guildId));

  if (aliases.length === 0) {
    return res.json(notFoundPayload());
  }

  return res.json({
    type: InteractionResponseType.Modal,
    data: {
      custom_id: JSON.stringify({
        t: 'cta',
        d: { a: ctaAction },
      }),
      title,
      components: [
        {
          type: ComponentType.Label,
          label: t('alias.modal.label.alias'),
          component: {
            type: ComponentType.StringSelect,
            custom_id: 'alias',
            placeholder: t('alias.modal.select.placeholder'),
            required: true,
            options: aliases.map(({ alias }) => ({
              label: alias,
              value: alias,
            })),
          },
        },
      ],
    },
  });
}
