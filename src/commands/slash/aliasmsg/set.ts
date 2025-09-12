import { Response } from "express";
import { CommandHandlerOptions, SubCommandOption } from "../../commands.js";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";

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
  { res }: CommandHandlerOptions<AliasMsgSetCommandData>,
  subcommand: AliasMsgSetSubCommandData,
): Promise<Response> => {
  const [alias, msg] = subcommand.options;

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
