import * as z from "zod";
import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import { logger } from "../../../logger.js";
import { InteractionCallback, InteractionResponseType } from "discord.js";

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
  { req, res }: CommandHandlerOptions<pollCCommandData>,
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

  return res.json({
    type: InteractionResponseType.Modal, // InteractionCallbackType.MODAL
    data: {
      custom_id: "game_feedback_modal",
      title: "Game Feedback",
      components: [
        {
          type: 18, // ComponentType.LABEL
          label: "What did you find interesting about the game?",
          description:
            "Please give us as much detail as possible so we can improve the game!",
          component: {
            type: 4, // ComponentType.TEXT_INPUT
            custom_id: "game_feedback",
            style: 2,
            min_length: 100,
            max_length: 4000,
            placeholder: "Write your feedback here...",
            required: true,
          },
        },
      ],
    },
  });
};
