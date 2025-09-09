import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";

import { type SlashCommandDeclaration } from "../commands";
import { getRandomEmoji } from "../../utils/getRandomEmoji";
import { ApplicationIntegrationType, InteractionContextType } from "discord.js";

export const version: SlashCommandDeclaration = {
  description: "Affiche la version de P'titPote Bot",
  contexts: [
    InteractionContextType.BotDM,
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ],
  integration_types: [
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ],
  handler: async function (req, res) {
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
  },
};
