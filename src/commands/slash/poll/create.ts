import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { logger } from "../../../logger.js";
import { assertInteractionUserIsModerator } from "../../assert/assertInteractionUserIsModerator.js";
import { notAllowed } from "../../commonMessages.js";

export interface pollCreateCommandData {
  id: string;
  name: string;
  options: [pollCreateSubCommandData];
  type: number;
}

export type pollCreateSubCommandData = {
  name: "create";
  options: [];
  type: number;
};

export const create = async (
  { req, res }: CommandHandlerOptions<pollCreateCommandData>,
  _subcommand: pollCreateSubCommandData,
): Promise<Response | null> => {


  try {
    assertInteractionUserIsModerator(req.body);
  } catch (error) {
    logger.error(error);
    return res.json(notAllowed());
  }

  const guildId = req.body.guild_id;
  if (guildId) {
    return res.json({
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: "cta",
          d: { a: "pollCreate" },
        }),
        title: "Créer un sondage",
        components: [
          {
            type: ComponentType.Label,
            label: `Titre du sondage`,
            component: {
              type: ComponentType.TextInput,
              custom_id: `title`,
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 45,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: `Role des sondés`,
            component: {
              type: ComponentType.RoleSelect,
              custom_id: `role`,
              required: false,
            },
          },
          {
            type: ComponentType.Label,
            label: `Question du sondage`,
            component: {
              type: ComponentType.TextInput,
              custom_id: `question`,
              style: TextInputStyle.Paragraph,
              min_length: 1,
              max_length: 400,
              required: true,
            },
          },
        ],
      },
    });
  }
  return null;
};
