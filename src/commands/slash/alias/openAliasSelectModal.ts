import type { DBServices } from '../../../db/db.js';
import { MessageAliased } from '../../../db/entities/MessageAliased.entity.js';
import { notFoundPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { ComponentType, InteractionResponseType } from 'discord-api-types/v10';
import { Response } from 'express';

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
  const messageAliaseds = await em.findAll(MessageAliased, {
    where: { server: { guildId } },
    orderBy: { alias: 'asc' },
  });

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
