import { Response } from "express";
import { CommandHandlerOptions } from "../../commands.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { MessageAliased } from "../../../db/entities/MessageAliased.entity.js";
import { foundItComponnents, notFoundPayload } from "../../commonMessages.js";

export interface aliasLsCommandData {
  id: string;
  name: string;
  options: [aliasLsSubCommandData];
  type: number;
}

export type aliasLsSubCommandData = {
  name: "ls";
  options: [];
  type: number;
};

export const ls = async ({
  req,
  res,
  dbServices,
}: CommandHandlerOptions<aliasLsCommandData>): Promise<Response | null> => {
  const guildId = req.body.guild_id;

  if (dbServices && guildId) {
    const em = dbServices.orm.em.fork();

    const messageAliaseds = await em.findAll(MessageAliased, {
      where: { server: { guildId } },
      orderBy: { alias: "asc" },
    });

    let components = [];
    if (messageAliaseds.length == 0) {
      return res.json(notFoundPayload());
    } else {
      components = [
        ...foundItComponnents(),
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
