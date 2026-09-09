import { Response } from 'express';
import { CommandHandlerOptions } from '../../commands.js';
import { t } from '../../../i18n/index.js';
import { openAliasSelectModal } from './openAliasSelectModal.js';

export interface aliasRmCommandData {
  id: string;
  name: string;
  options: [aliasRmSubCommandData];
  type: number;
}

export type aliasRmSubCommandData = {
  name: 'rm';
  options: [];
  type: number;
};

export const rm = async (
  { req, res, dbServices }: CommandHandlerOptions<aliasRmCommandData>,
  _subcommand: aliasRmSubCommandData,
): Promise<Response | null> => {
  return openAliasSelectModal({
    res,
    dbServices,
    guildId: req.body.guild_id,
    ctaAction: 'aliasRm',
    title: t('alias.modal.rm.title'),
  });
};
