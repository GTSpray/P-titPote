import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";

import { CommandHandlerOptions } from "../../commands.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Response } from "express";
import { foundItComponnents } from "../../commonMessages.js";

const builder = new SlashCommandBuilder()
  .setDescription("Affiche une image de loutre")
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
  name: "otter";
  type: number;
};

export const otter = async ({
  res,
}: CommandHandlerOptions<gimmeOtterCommandData>): Promise<Response | null> => {
  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      components: [
        ...foundItComponnents(),
        {
          type: MessageComponentTypes.MEDIA_GALLERY,
          items: [
            {
              description: "otter",
              media: {
                url: "https://github.com/GTSpray/P-titPote/raw/main/assets/otter.png?raw=true",
              },
            },
          ],
        },
      ],
    },
  });
};
