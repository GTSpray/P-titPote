import * as z from "zod";
import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { DiscordGuild } from "../../../db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "../../../db/entities/MessageAliased.entity.js";
import { logger } from "../../../logger.js";
import { okComponnents } from "../../commonMessages.js";

export interface aliasSetCommandData {
  id: string;
  name: string;
  options: [aliasSetSubCommandData];
  type: number;
}

export type aliasSetSubCommandData = {
  name: "set";
  options: [
    SubCommandOption<"alias", string>,
    SubCommandOption<"message", string>,
  ];
  type: number;
};

const ValidAliasMessage = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
  message: z.string().min(1).max(500),
});

export const set = async (
  { req, res, dbServices }: CommandHandlerOptions<aliasSetCommandData>,
  subcommand: aliasSetSubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  const [alias, msg] = subcommand.options;

  const AliasMessageInput = ValidAliasMessage.safeParse({
    alias: alias.value,
    message: msg.value,
  });

  if (!AliasMessageInput.success) {
    const issues = AliasMessageInput.error.issues;
    logger.debug("zod errors", { issues });
    return res
      .status(400)
      .json({ error: "invalid subcommand payload", issues });
  }

  if (dbServices && guildId) {
    let guild: DiscordGuild;

    const em = dbServices.orm.em.fork();

    guild =
      (await em.findOne(
        DiscordGuild,
        { guildId },
        { populate: ["messageAliaseds"] },
      )) || new DiscordGuild(guildId);

    let messageAliased = guild.messageAliaseds.find(
      (aliasedMsg) => aliasedMsg.alias === AliasMessageInput.data.alias,
    );

    if (!messageAliased) {
      messageAliased = new MessageAliased(
        AliasMessageInput.data.alias,
        AliasMessageInput.data.message,
      );
      guild.messageAliaseds.add(messageAliased);
      await em.persist(guild).flush();
    }

    messageAliased.message = AliasMessageInput.data.message;

    await em.persist(messageAliased).flush();
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [...okComponnents()],
      },
    });
  }

  return null;
};
