import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";

import { type SlashCommandDeclaration } from "../commands.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

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

export type GimmeotterDataOpts = {};
export const gimmeotter: SlashCommandDeclaration<GimmeotterDataOpts> = {
  builder,
  handler: async function ({ res }) {
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: "Voilà.. ce que j'ai trouvé",
          },
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
  },
};
