import type { Response } from 'express';
import type { CommandHandlerOptions } from '../../commands.js';
import { t } from '../../../i18n/index.js';
import { openAliasSelectModal } from './openAliasSelectModal.js';

export interface aliasSayCommandData {
  id: string;
  name: string;
  options: [aliasSaySubCommandData];
  type: number;
}

export type aliasSaySubCommandData = {
  name: 'say';
  options: [];
  type: number;
};

export const say = async (
  { req, res, dbServices }: CommandHandlerOptions<aliasSayCommandData>,
  _subcommand: aliasSaySubCommandData,
): Promise<Response | null> => {
  return openAliasSelectModal({
    res,
    dbServices,
    guildId: req.body.guild_id,
    ctaAction: 'aliasSay',
    title: t('alias.modal.say.title'),
  });
};
