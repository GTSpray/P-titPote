import { Response } from 'express';
import { CommandHandlerOptions } from '../../commands.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { foundItComponnents, notFoundPayload } from '../../commonMessages.js';
import { MessageAliasedLister } from '../../../db/model/index.js';
import {
  ListAliasesQuery,
  ListAliasesQueryHandler,
} from '../../../domain/alias/listAliasesQuery.js';

export interface aliasLsCommandData {
  id: string;
  name: string;
  options: [aliasLsSubCommandData];
  type: number;
}

export type aliasLsSubCommandData = {
  name: 'ls';
  options: [];
  type: number;
};

export const ls = async ({
  req,
  res,
  dbServices,
}: CommandHandlerOptions<aliasLsCommandData>): Promise<Response | null> => {
  const guildId = req.body.guild_id;

  if (!dbServices || !guildId) {
    return null;
  }

  const aliases = await new ListAliasesQueryHandler(
    MessageAliasedLister,
  ).handle(new ListAliasesQuery(guildId));

  let components = [];
  if (aliases.length == 0) {
    return res.json(notFoundPayload());
  } else {
    components = [
      ...foundItComponnents(),
      {
        type: ComponentType.TextDisplay,
        content: aliases.map((alias) => `* ${alias.alias}`).join('\n'),
      },
    ];
  }
  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.IsComponentsV2,
      components,
    },
  });
};
