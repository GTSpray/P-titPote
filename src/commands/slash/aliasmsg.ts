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

import { MessageAliased } from "../../db/entities/MessageAliased.entity.js";
import { logger } from "../../logger.js";

const builder = new SlashCommandBuilder()
  .setDescription("Alias un message")
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
  .setContexts(
    InteractionContextType.BotDM,
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  )
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set")
      .setDescription("definit un alias message")
      .addStringOption((opt) =>
        opt
          .setName("alias")
          .setDescription("alias du message")
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("message")
          .setDescription("contenu du message")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("unset")
      .setDescription("definit un alias message")
      .addStringOption((opt) =>
        opt
          .setName("alias")
          .setDescription("alias du message")
          .setRequired(true),
      ),
  );

export const aliasmsg: SlashCommandDeclaration = {
  builder,
  handler: async function ({ req, res, orm }) {
    const message = await orm.em.findOne(MessageAliased, {
      server: { serverId: req.body.guild_id },
      alias: "toto",
    });
    logger.debug("alias message", { message });
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: "Voilà.. ce que j'ai trouvé",
          },
        ],
      },
    });
  },
};
