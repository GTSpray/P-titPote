import { Response } from 'express';
import { CommandHandlerOptions } from '../../commands.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { t } from '../../../i18n/index.js';

export interface triggerSetCommandData {
  id: string;
  name: string;
  options: [triggerSetSubCommandData];
  type: number;
}

export type triggerSetSubCommandData = {
  name: 'set';
  options: [];
  type: number;
};

export const set = async (
  { req, res }: CommandHandlerOptions<triggerSetCommandData>,
  _subcommand: triggerSetSubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  if (!guildId) {
    return null;
  }

  // Discord forbids responding to a Modal Submit with another Modal.
  // Pick the kind via a message select, then open the config modal.
  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: t('trigger.set.chooseKind'),
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
};
