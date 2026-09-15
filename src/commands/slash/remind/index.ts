import { type SlashCommandDeclaration } from '../../commands.js';
import {
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { SlashCommandBuilder } from 'discord.js';
import { errorPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { isThreadChannel } from '../../../utils/isThreadChannel.js';

const builder = new SlashCommandBuilder()
  .setDescription(t('remind.description'))
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
  .setContexts(InteractionContextType.Guild)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall);

export interface remindCommandData {
  id: string;
  name: string;
  options?: [];
  type: number;
}

export const remind: SlashCommandDeclaration<remindCommandData> = {
  builder,
  handler: async function ({ req, res }) {
    if (!isThreadChannel(req.body.channel)) {
      return res.json(errorPayload(t('remind.on.notThread')));
    }

    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.menu.chooseAction'),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'remindMenu' },
                }),
                placeholder: t('remind.menu.placeholder'),
                options: [
                  {
                    label: t('remind.action.on'),
                    value: 'on',
                  },
                  {
                    label: t('remind.action.status'),
                    value: 'status',
                  },
                  {
                    label: t('remind.action.off'),
                    value: 'off',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  },
};
