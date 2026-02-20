import * as z from "zod";
import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import { logger } from "../../../logger.js";
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
} from "discord-api-types/v10";
import { DiscordGuild } from "../../../db/entities/DiscordGuild.entity.js";
import { Poll } from "../../../db/entities/Poll.entity.js";
import {
  InteractionResponseFlags,
  MessageComponentTypes,
} from "discord-interactions";

export interface pollCCommandData {
  id: string;
  name: string;
  options: [pollCSubCommandData];
  type: number;
}

export type pollCSubCommandData = {
  name: "c";
  options: [
    SubCommandOption<"question", string>,
    SubCommandOption<"role", string>?,
  ];
  type: number;
};

const ValidpollMessage = z.object({
  question: z.string().min(1).max(50),
  role: z
    .string()
    .regex(/^[0-9]+$/)
    .min(1)
    .max(50)
    .optional(),
});

export const c = async (
  { req, res, dbServices }: CommandHandlerOptions<pollCCommandData>,
  subcommand: pollCSubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  const [question, role] = subcommand.options;

  const pollMessageInput = ValidpollMessage.safeParse({
    question: question.value,
    role: role?.value,
  });

  if (!pollMessageInput.success) {
    const issues = pollMessageInput.error.issues;
    logger.debug("zod errors", { issues });
    return res
      .status(400)
      .json({ error: "invalid subcommand payload", issues });
  }

  if (dbServices && guildId) {
    let guild: DiscordGuild;
    const em = dbServices.orm.em.fork();
    guild =
      (await em.findOne(DiscordGuild, { guildId })) ||
      new DiscordGuild(guildId);

    const aPoll = new Poll("a poll title", pollMessageInput.data.question);
    if (pollMessageInput.data.role) {
      aPoll.role = pollMessageInput.data.role;
    }
    guild.polls.add(aPoll);
    await em.persist(guild).flush();

    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.SECTION,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content:
                  "# Oyé Oyé!\n-# Le staff réclame votre attention pour un sondage!",
              },
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: "a question",
              },
            ],
            accessory: {
              type: MessageComponentTypes.THUMBNAIL,
              media: {
                url: `https://raw.githubusercontent.com/GTSpray/P-titPote/poll/assets/ptitpote-sam.png?salt=${aPoll.id}`,
              },
            },
          },
          {
            type: MessageComponentTypes.SEPARATOR,
            divider: true,
            spacing: 1,
          },
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                style: ButtonStyle.Primary,
                label: "Je vote!",
                custom_id: JSON.stringify({
                  t: "cta",
                  d: { a: "pollresp", pId: aPoll.id },
                }),
              },
            ],
          },
        ],
      },
    });
  }
  return null;
};
