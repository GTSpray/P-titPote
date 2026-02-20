import * as z from "zod";

import { type SlashCommandDeclaration } from "../../commands.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { pollCCommandData, c } from "./c.js";
import { create, pollCreateCommandData } from "./create.js";
import { Response } from "express";
import { logger } from "../../../logger.js";

const builder = new SlashCommandBuilder()
  .setDescription("Gestion de sondage")
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
      .setName("c")
      .setDescription("créer un sondage")
      .addStringOption((opt) =>
        opt
          .setName("question")
          .setDescription("question à laquelle les sondées repondent")
          .setRequired(true),
      )
      .addRoleOption((opt) =>
        opt
          .setName("role")
          .setDescription("rôle des sondées")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("create").setDescription("créer un sondage"),
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
    .min(0),
});

export type pollDataOpts = pollCCommandData | pollCreateCommandData;
export const poll: SlashCommandDeclaration<pollDataOpts> = {
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
      case "c":
        result = await c(<any>handlerOpts, <any>req.body.data?.options[0]);
        break;
      case "create":
        result = await create(<any>handlerOpts, <any>req.body.data?.options[0]);
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
