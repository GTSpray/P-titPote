import type { DBServices } from '../../../db/db.js';
import { notFoundPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { ComponentType, InteractionResponseType } from 'discord-api-types/v10';
import { Response } from 'express';
import { ListMessageAliasesQuery } from '../../../queries/listMessageAliases.query.js';
import { ListMessageAliasesQueryHandler } from '../../../handlers/listMessageAliases.queryHandler.js';
import { createMessageAliasedLister } from '../../../repositories/messageAliased/messageAliased.lister.js';

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

  const em = dbServices.orm.em.fork();
  const handler = new ListMessageAliasesQueryHandler(
    createMessageAliasedLister(em),
  );
  const messageAliaseds = await handler.handle(
    new ListMessageAliasesQuery(guildId),
  );

  if (messageAliaseds.length === 0) {
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
            options: messageAliaseds.map(({ alias }) => ({
              label: alias,
              value: alias,
            })),
          },
        },
      ],
    },
  });
}
