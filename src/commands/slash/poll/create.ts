import * as z from "zod";
import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from "discord-api-types/v10";
import { DiscordGuild } from "../../../db/entities/DiscordGuild.entity.js";

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
  { req, res, dbServices }: CommandHandlerOptions<pollCreateCommandData>,
  subcommand: pollCreateSubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  subcommand.options[0];
  const roleParam = subcommand.options.find((e) => e?.name === "role");
  const choiceParam = subcommand.options.find((e) => e?.name === "choice");

  console.log({
    choiceParam,
    roleParam,
  });

  const choice = choiceParam?.value || 0;
  const role = roleParam?.value || undefined;

  let questionDesc =
    'Les sondés ne pourront répondre que "oui" ou "non", donc prévois une question fermée';
  let placeholder =
    'Est ce que vous pensez que Lila doit être élue "déesse la plus incoryable"?';
  if (choice > 0) {
    questionDesc = `Les sondés ne pourront selectionner qu\'un seul des ${choice} choix ci dessous`;
    placeholder = "Quelle est la divinité qui vous inspire le plus d'amour?";
  }

  if (dbServices && guildId) {
    let guild: DiscordGuild;
    const em = dbServices.orm.em.fork();
    guild =
      (await em.findOne(DiscordGuild, { guildId })) ||
      new DiscordGuild(guildId);

    const custom_id = JSON.stringify({
      t: "cta",
      d: { a: "pollCreate", role },
    });

    return res.json({
      type: InteractionResponseType.Modal,
      data: {
        custom_id,
        title: "Créer un sondage",
        components: [
          {
            type: ComponentType.Label,
            label: `Question`,
            description: `${questionDesc}`,
            component: {
              type: ComponentType.TextInput,
              custom_id: `question`,
              style: TextInputStyle.Paragraph,
              min_length: 1,
              max_length: 400,
              placeholder: `Par exemple : "${placeholder}"`,
              required: true,
            },
          },
          ...Array.from({ length: choice }).map((_e, i) => ({
            type: ComponentType.Label,
            label: `Choix ${i + 1}`,
            description: `Libellé du choix ${i + 1}`,
            component: {
              type: ComponentType.TextInput,
              custom_id: `choice${i}`,
              style: TextInputStyle.Paragraph,
              min_length: 1,
              max_length: 200,
              placeholder: `Écris le libellé du choix ${i + 1} ici...`,
              required: true,
            },
          })),
        ],
      },
    });
  }
  return null;
};
