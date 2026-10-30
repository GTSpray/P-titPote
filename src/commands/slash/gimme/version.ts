import type { CommandHandlerOptions } from '../../commands.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';

import { getRandomEmoji } from '../../../utils/getRandomEmoji.js';

import type { Response } from 'express';
import { t } from '../../../i18n/index.js';

export interface gimmeVersionCommandData {
  id: string;
  name: string;
  options: [gimmeVersionSubCommandData];
  type: number;
}

export type gimmeVersionSubCommandData = {
  name: 'version';
  type: number;
};

export const version = async ({
  res,
}: CommandHandlerOptions<gimmeVersionCommandData>): Promise<Response | null> => {
  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: t('gimme.version.message', {
            emoji: getRandomEmoji(),
            version: process.env.npm_package_version ?? 'unknown',
          }),
        },
      ],
    },
  });
};
