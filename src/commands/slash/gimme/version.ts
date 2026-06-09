import { CommandHandlerOptions } from '../../commands.js';
import {
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { SlashCommandBuilder } from 'discord.js';

import { getRandomEmoji } from '../../../utils/getRandomEmoji.js';

import { Response } from 'express';
import { t } from '../../../i18n/index.js';

const builder = new SlashCommandBuilder()
  .setDescription(t('gimme.otter.description'))
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

export interface gimmeVersionCommandData {
  id: string;
  name: string;
  options: [gimmeVersionSubCommandData];
  type: number;
}

export type gimmeVersionSubCommandData = {
  name: 'version';
  type: number;
};

export const version = async ({
  res,
}: CommandHandlerOptions<gimmeVersionCommandData>): Promise<Response | null> => {
  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: t('gimme.version.message', {
            emoji: getRandomEmoji(),
            version: process.env.npm_package_version ?? 'unknown',
          }),
        },
      ],
    },
  });
};
