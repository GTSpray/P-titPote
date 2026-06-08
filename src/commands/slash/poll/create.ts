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
import { t } from "../../../i18n/index.js";

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
        title: t("poll.modal.create.title"),
        components: [
          {
            type: ComponentType.Label,
            label: t("poll.modal.label.title"),
            component: {
              type: ComponentType.TextInput,
              custom_id: "title",
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 45,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t("poll.modal.label.role"),
            component: {
              type: ComponentType.RoleSelect,
              custom_id: "role",
              required: false,
            },
          },
          {
            type: ComponentType.Label,
            label: t("poll.modal.label.question"),
            component: {
              type: ComponentType.TextInput,
              custom_id: "question",
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 45,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t("poll.modal.label.description"),
            component: {
              type: ComponentType.TextInput,
              custom_id: "description",
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 100,
              required: false,
            },
          },
        ],
      },
    });
  }
  return null;
};
