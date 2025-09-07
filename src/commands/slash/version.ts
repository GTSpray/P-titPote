import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";

import {
  Contexts,
  IntegrationTypes,
  type SlashCommandDeclaration,
} from "../commands";
import { getRandomEmoji } from "../../utils/getRandomEmoji";

export const version: SlashCommandDeclaration = {
  description: "Affiche la version de P'titPote Bot",
  contexts: [Contexts.GUILD, Contexts.BOT_DM, Contexts.PRIVATE_CHANNEL],
  integration_types: [
    IntegrationTypes.GUILD_INSTALL,
    IntegrationTypes.USER_INSTALL,
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
