import * as z from "zod";
import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { logger } from "../../../logger.js";
import { MessageAliased } from "../../../db/entities/MessageAliased.entity.js";

export interface AliasMsgSayCommandData {
  id: string;
  name: string;
  options: [AliasMsgSaySubCommandData];
  type: number;
}

export type AliasMsgSaySubCommandData = {
  name: "say";
  options: [SubCommandOption<"alias", string>];
  type: number;
};

const ValidAliasMessage = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
});

export const say = async (
  { req, res, dbServices }: CommandHandlerOptions<AliasMsgSayCommandData>,
  subcommand: AliasMsgSaySubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  const [alias] = subcommand.options;

  const AliasMessageInput = ValidAliasMessage.safeParse({
    alias: alias.value,
  });

  if (!AliasMessageInput.success) {
    const issues = AliasMessageInput.error.issues;
    logger.debug("zod errors", { issues });
    return res
      .status(400)
      .json({ error: "invalid subcommand payload", issues });
  }

  if (dbServices && guildId) {
    const em = dbServices.orm.em.fork();

    const messageAliased = await em.findOne(MessageAliased, {
      server: { guildId },
      alias: AliasMessageInput.data.alias,
    });

    if (messageAliased) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: messageAliased.message,
            },
          ],
        },
      });
    } else {
      return res.status(404).json({
        error: "alias not found",
        context: { alias: AliasMessageInput.data.alias },
      });
    }
  }

  return null;
};
