import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { DiscordGuild } from "../../../db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "../../../db/entities/MessageAliased.entity.js";

export interface AliasMsgSetCommandData {
  id: string;
  name: string;
  options: [AliasMsgSetSubCommandData];
  type: number;
}

type AliasMsgSetSubCommandData = {
  name: "set";
  options: [
    SubCommandOption<"alias", string>,
    SubCommandOption<"message", string>,
  ];
  type: number;
};

export const set = async (
  { req, res, dbServices }: CommandHandlerOptions<AliasMsgSetCommandData>,
  subcommand: AliasMsgSetSubCommandData,
): Promise<Response> => {
  const guildId = req.body.guild_id;
  let guild: DiscordGuild | undefined;

  const em = dbServices?.orm.em.fork();

  if (guildId) {
    const p = await em?.findOne(DiscordGuild, { guildId });
    if (!p) {
      guild = new DiscordGuild();
      guild.guildId = guildId;
      await em?.persist(guild);
    } else {
      guild = p;
    }
  }

  if (!guild) {
    return res.status(500).json({ error: "invalid" });
  }

  const [alias, msg] = subcommand.options;

  const messageAliased =
    (await em?.findOne(MessageAliased, {
      server: guild,
      alias: alias.value,
    })) || new MessageAliased();

  messageAliased.server = guild;
  messageAliased.alias = alias.value;
  messageAliased.message = msg.value;

  await em?.persist(messageAliased).flush();

  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      components: [
        {
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: `${alias.value} = ${msg.value}`,
        },
      ],
    },
  });
};
