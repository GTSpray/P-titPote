import * as z from "zod";

import { type SlashCommandDeclaration } from "../commands.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { AliasMsgSetCommandData, set } from "./aliasmsg/set.js";
import { AliasMsgSayCommandData, say } from "./aliasmsg/say.js";
import { AliasMsgLsCommandData, ls } from "./aliasmsg/ls.js";
import { Response } from "express";
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
      .setName("say")
      .setDescription("demande a p'titpote d'envoyer le message")
      .addStringOption((opt) =>
        opt
          .setName("alias")
          .setDescription("alias du message")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("ls")
      .setDescription("liste les alias disponnibles sur ton serveur"),
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

export type AliasMsgDataOpts =
  | AliasMsgSetCommandData
  | AliasMsgSayCommandData
  | AliasMsgLsCommandData;
export const aliasmsg: SlashCommandDeclaration<AliasMsgDataOpts> = {
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
      case "set":
        result = await set(<any>handlerOpts, <any>req.body.data?.options[0]);
        break;
      case "say":
        result = await say(<any>handlerOpts, <any>req.body.data?.options[0]);
        break;
      case "ls":
        result = await ls(<any>handlerOpts);
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
