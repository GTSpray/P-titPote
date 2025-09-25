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

import { getRandomEmoji } from "../../../utils/getRandomEmoji.js";

import { Response } from "express";

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

export interface gimmeVersionCommandData {
  id: string;
  name: string;
  options: [gimmeVersionSubCommandData];
  type: number;
}

export type gimmeVersionSubCommandData = {
  name: "version";
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
          content: `Hello here ${getRandomEmoji()}! \nJe suis P'titPote v${process.env.npm_package_version}.`,
        },
      ],
    },
  });
};
