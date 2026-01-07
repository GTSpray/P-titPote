import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";

export interface pollCreateCommandData {
  id: string;
  name: string;
  options: [pollCreateSubCommandData];
  type: number;
}

export type pollCreateSubCommandData = {
  name: "create";
  options: [
    SubCommandOption<"choice", number>?,
    SubCommandOption<"role", string>?,
  ];
  type: number;
};

export const create = async (
  { req, res }: CommandHandlerOptions<pollCreateCommandData>,
  subcommand: pollCreateSubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  subcommand.options[0];
  const roleParam = subcommand.options.find((e) => e?.name === "role");
  const role = roleParam?.value || undefined;
  if (guildId) {
    return res.json({
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: "cta",
          d: { a: "pollCreate", role },
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
