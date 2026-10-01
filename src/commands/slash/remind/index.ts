import * as z from 'zod';

import { type SlashCommandDeclaration } from '../../commands.js';
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { SlashCommandBuilder } from 'discord.js';

import { Response } from 'express';
import { logger } from '../../../logger.js';
import { on, remindOnCommandData } from './on.js';
import { status, remindStatusCommandData } from './status.js';
import { off, remindOffCommandData } from './off.js';
import { t } from '../../../i18n/index.js';
import {
  REMIND_DAYS_MAX,
  REMIND_DAYS_MIN,
} from '../../../utils/remindConstants.js';

const builder = new SlashCommandBuilder()
  .setDescription(t('remind.description'))
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
  .setContexts(InteractionContextType.Guild)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('on')
      .setDescription(t('remind.sub.on.description'))
      .addIntegerOption((option) =>
        option
          .setName('days')
          .setDescription(t('remind.option.days'))
          .setRequired(true)
          .setMinValue(REMIND_DAYS_MIN)
          .setMaxValue(REMIND_DAYS_MAX),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('status')
      .setDescription(t('remind.sub.status.description')),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('off').setDescription(t('remind.sub.off.description')),
  );

const ValidCommandPayload = z.object({
  id: z.any(),
  name: z.string(),
  options: z
    .array(
      z.object({
        name: z.string(),
      }),
    )
    .min(1),
});

export type remindDataOpts =
  remindOnCommandData | remindStatusCommandData | remindOffCommandData;

export const remind: SlashCommandDeclaration<remindDataOpts> = {
  builder,
  handler: async function (handlerOpts) {
    const { req, res } = handlerOpts;
    const command = ValidCommandPayload.safeParse(req.body.data);

    if (!command.success) {
      const issues = command.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidCommandPayload'), issues });
    }

    const [subcommand] = command.data.options;
    let result: Response | null;
    switch (subcommand.name) {
      case 'on':
        result = await on(<any>handlerOpts, <any>req.body.data?.options[0]);
        break;
      case 'status':
        result = await status(<any>handlerOpts);
        break;
      case 'off':
        result = await off(<any>handlerOpts);
        break;
      default:
        result = res.status(400).json({
          error: t('errors.invalidSubcommand'),
          context: {
            subcommandName: subcommand.name,
          },
        });
        break;
    }

    return (
      result ??
      res.status(500).json({
        error: t('errors.unmetResult'),
      })
    );
  },
};
