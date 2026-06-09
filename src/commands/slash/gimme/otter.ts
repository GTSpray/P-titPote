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

import { Response } from 'express';
import { foundItComponnents } from '../../commonMessages.js';
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

export interface gimmeOtterCommandData {
  id: string;
  name: string;
  options: [gimmeOtterSubCommandData];
  type: number;
}

export type gimmeOtterSubCommandData = {
  name: 'otter';
  type: number;
};

export const otter = async ({
  res,
}: CommandHandlerOptions<gimmeOtterCommandData>): Promise<Response | null> => {
  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.IsComponentsV2,
      components: [
        ...foundItComponnents(),
        {
          type: ComponentType.MediaGallery,
          items: [
            {
              description: 'otter',
              media: {
                url: 'https://github.com/GTSpray/P-titPote/raw/main/assets/otter.png?raw=true',
              },
            },
          ],
        },
      ],
    },
  });
};
