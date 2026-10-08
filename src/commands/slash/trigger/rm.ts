import { Response } from 'express';
import { CommandHandlerOptions } from '../../commands.js';
import { ComponentType, InteractionResponseType } from 'discord-api-types/v10';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { notFoundPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

export interface triggerRmCommandData {
  id: string;
  name: string;
  options: [triggerRmSubCommandData];
  type: number;
}

export type triggerRmSubCommandData = {
  name: 'rm';
  options: [];
  type: number;
};

export const rm = async (
  { req, res, dbServices }: CommandHandlerOptions<triggerRmCommandData>,
  _subcommand: triggerRmSubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  if (!dbServices || !guildId) {
    return null;
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

  return res.json({
    type: InteractionResponseType.Modal,
    data: {
      custom_id: JSON.stringify({
        t: 'cta',
        d: { a: 'triggerRm' },
      }),
      title: t('trigger.modal.rm.title'),
      components: [
        {
          type: ComponentType.Label,
          label: t('trigger.modal.label.trigger'),
          component: {
            type: ComponentType.StringSelect,
            custom_id: 'trigger',
            placeholder: t('trigger.modal.select.trigger.placeholder'),
            required: true,
            options: triggers.map((aTrigger) => {
              const kindLabel =
                aTrigger.kind === 'welcome_message'
                  ? t('trigger.kind.welcome_message')
                  : t('trigger.kind.welcome_role');
              const statusLabel = aTrigger.enabled
                ? t('trigger.status.enabled')
                : t('trigger.status.disabled');
              return {
                label: aTrigger.name,
                value: aTrigger.name,
                description: `${kindLabel} — ${statusLabel}`.slice(0, 100),
              };
            }),
          },
        },
        {
          type: ComponentType.Label,
          label: t('trigger.modal.label.action'),
          component: {
            type: ComponentType.StringSelect,
            custom_id: 'action',
            placeholder: t('trigger.modal.select.action.placeholder'),
            required: true,
            options: [
              {
                label: t('trigger.action.enable'),
                value: 'enable',
              },
              {
                label: t('trigger.action.disable'),
                value: 'disable',
              },
              {
                label: t('trigger.action.delete'),
                value: 'delete',
              },
            ],
          },
        },
      ],
    },
  });
};
