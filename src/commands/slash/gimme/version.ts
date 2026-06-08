import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';

import { CommandHandlerOptions } from '../../commands.js';
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';

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
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      components: [
        {
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: t('gimme.version.message', {
            emoji: getRandomEmoji(),
            version: process.env.npm_package_version ?? 'unknown',
          }),
        },
      ],
    },
  });
};
