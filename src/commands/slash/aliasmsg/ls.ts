import * as z from "zod";
import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { MessageAliased } from "../../../db/entities/MessageAliased.entity.js";

export interface AliasMsgLsCommandData {
  id: string;
  name: string;
  options: [AliasMsgLsSubCommandData];
  type: number;
}

export type AliasMsgLsSubCommandData = {
  name: "ls";
  options: [];
  type: number;
};

export const ls = async ({
  req,
  res,
  dbServices,
}: CommandHandlerOptions<AliasMsgLsCommandData>): Promise<Response | null> => {
  const guildId = req.body.guild_id;

  if (dbServices && guildId) {
    const em = dbServices.orm.em.fork();

    const messageAliaseds = await em.findAll(MessageAliased, {
      where: { server: { guildId } },
      orderBy: { alias: "asc" },
    });

    let components = [];
    if (messageAliaseds.length == 0) {
      components = [
        {
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: `ahem... j'ai rien trouvé... 🤷`,
        },
      ];
    } else {
      components = [
        {
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: "Voilà.. ce que j'ai trouvé",
        },
        {
          type: MessageComponentTypes.SEPARATOR, // ComponentType.SEPARATOR
          divider: true,
          spacing: 1,
        },
        {
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: messageAliaseds.map((e) => `* ${e.alias}`).join("\n"),
        },
      ];
    }
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components,
      },
    });
  }

  return null;
};
