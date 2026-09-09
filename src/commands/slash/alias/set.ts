import { Response } from 'express';
import { CommandHandlerOptions } from '../../commands.js';
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { t } from '../../../i18n/index.js';

export interface aliasSetCommandData {
  id: string;
  name: string;
  options: [aliasSetSubCommandData];
  type: number;
}

export type aliasSetSubCommandData = {
  name: 'set';
  options: [];
  type: number;
};

export const set = async (
  { req, res }: CommandHandlerOptions<aliasSetCommandData>,
  _subcommand: aliasSetSubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  if (guildId) {
    return res.json({
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'aliasSet' },
        }),
        title: t('alias.modal.set.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('alias.modal.label.alias'),
            description: t('alias.modal.description.alias'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'alias',
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 50,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t('alias.modal.label.message'),
            description: t('alias.modal.description.message'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'message',
              style: TextInputStyle.Paragraph,
              min_length: 1,
              max_length: 500,
              required: true,
            },
          },
        ],
      },
    });
  }
  return null;
};
