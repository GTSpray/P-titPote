import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
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
import { logger } from '../../../logger.js';
import { notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

const builder = new SlashCommandBuilder()
  .setDescription(t('trigger.description'))
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
  .setContexts(
    InteractionContextType.BotDM,
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  )
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  );

export interface triggerCommandData {
  id: string;
  name: string;
  options?: [];
  type: number;
}

export const trigger: SlashCommandDeclaration<triggerCommandData> = {
  builder,
  handler: async function ({ req, res }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    if (!req.body.guild_id) {
      return res.status(500).json({
        error: t('errors.unmetResult'),
      });
    }

    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.menu.chooseAction'),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'triggerMenu' },
                }),
                placeholder: t('trigger.menu.placeholder'),
                options: [
                  {
                    label: t('trigger.action.create'),
                    value: 'create',
                  },
                  {
                    label: t('trigger.action.update'),
                    value: 'update',
                  },
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
            ],
          },
        ],
      },
    });
  },
};
