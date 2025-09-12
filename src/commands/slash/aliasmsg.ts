import { type SlashCommandDeclaration } from "../commands.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { AliasMsgSetCommandData, set } from "./aliasmsg/set.js";
import { Response } from "express";

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

export type AliasmsgDataOpts = AliasMsgSetCommandData;

export const aliasmsg: SlashCommandDeclaration<AliasmsgDataOpts> = {
  builder,
  handler: async function (handlerOpts) {
    const { req, res } = handlerOpts;
    const { data } = req.body;

    if (data) {
      const [subcommand] = data.options;
      let result: Response;
      switch (subcommand.name) {
        case "set":
          result = await set(handlerOpts, subcommand);
          break;
        default:
          result = res.status(500).json({ error: "invalid" });
          break;
      }

      return result;
    }

    return res.status(500).json({ error: "invalid" });
  },
};
