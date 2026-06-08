import * as z from "zod";
import { assertInteractionUserIsModerator } from "../../assert/assertInteractionUserIsModerator.js";
import { type SlashCommandDeclaration } from "../../commands.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { aliasSetCommandData, set } from "./set.js";
import { aliasSayCommandData, say } from "./say.js";
import { aliasLsCommandData, ls } from "./ls.js";
import { Response } from "express";
import { logger } from "../../../logger.js";
import { notAllowed } from "../../commonMessages.js";
import { t } from "../../../i18n/index.js";

const builder = new SlashCommandBuilder()
  .setDescription(t("alias.description"))
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
      .setDescription(t("alias.sub.set.description"))
      .addStringOption((opt) =>
        opt
          .setName("alias")
          .setDescription(t("alias.option.alias"))
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("message")
          .setDescription(t("alias.option.message"))
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("say")
      .setDescription(t("alias.sub.say.description"))
      .addStringOption((opt) =>
        opt
          .setName("alias")
          .setDescription(t("alias.option.alias"))
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("ls").setDescription(t("alias.sub.ls.description")),
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

export type aliasDataOpts =
  | aliasSetCommandData
  | aliasSayCommandData
  | aliasLsCommandData;
export const alias: SlashCommandDeclaration<aliasDataOpts> = {
  builder,
  handler: async function (handlerOpts) {
    const { req, res } = handlerOpts;

    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const command = ValidCommandPayload.safeParse(req.body.data);

    if (!command.success) {
      const issues = command.error.issues;
      logger.debug("zod errors", { issues });
      return res
        .status(400)
        .json({ error: t("errors.invalidCommandPayload"), issues });
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
          error: t("errors.invalidSubcommand"),
          context: {
            subcommandName: subcommand.name,
          },
        });
        break;
    }

    return (
      result ??
      res.status(500).json({
        error: t("errors.unmetResult"),
      })
    );
  },
};
