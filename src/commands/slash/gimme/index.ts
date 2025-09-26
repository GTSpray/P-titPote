import * as z from "zod";

import { type SlashCommandDeclaration } from "../../commands.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Response } from "express";
import { logger } from "../../../logger.js";
import { gimmeOtterCommandData, otter } from "./otter.js";
import { gimmeVersionCommandData, version } from "./version.js";
import {
  emoji,
  gimmeEmojiCommandData,
  stealemoji_emojiLimit,
  stealemoji_msgLimit,
} from "./emoji.js";

const builder = new SlashCommandBuilder()
  .setDescription("Récupère une image")
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
    subcommand.setName("otter").setDescription("Affiche une image de loutre"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("emoji")
      .setDescription(
        `Récupère les ${stealemoji_emojiLimit} dernières emotes dans les ${stealemoji_msgLimit} derniers messages de ce chan`,
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("version")
      .setDescription("Affiche la version de P'titPote Bot"),
  );

const ValidCommandPayload = z.object({
  id: z.any(),
  name: z.string(),
  options: z
    .array(
      z.object({
        name: z.string(),
      }),
    )
    .min(1),
});

export type gimmeDataOpts =
  | gimmeOtterCommandData
  | gimmeEmojiCommandData
  | gimmeVersionCommandData;

export const gimme: SlashCommandDeclaration<gimmeDataOpts> = {
  builder,
  handler: async function (handlerOpts) {
    const { req, res } = handlerOpts;
    const command = ValidCommandPayload.safeParse(req.body.data);

    if (!command.success) {
      const issues = command.error.issues;
      logger.debug("zod errors", { issues });
      return res.status(400).json({ error: "invalid command payload", issues });
    }

    const [subcommand] = command.data.options;
    let result: Response | null;
    switch (subcommand.name) {
      case "otter":
        result = await otter(<any>handlerOpts);
        break;
      case "emoji":
        result = await emoji(<any>handlerOpts);
        break;
      case "version":
        result = await version(<any>handlerOpts);
        break;
      default:
        result = res.status(400).json({
          error: "invalid subcommand",
          context: {
            subcommandName: subcommand.name,
          },
        });
        break;
    }

    return (
      result ??
      res.status(500).json({
        error: "unmeet result",
      })
    );
  },
};
