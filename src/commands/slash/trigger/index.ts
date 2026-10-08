import * as z from 'zod';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { type SlashCommandDeclaration } from '../../commands.js';
import {
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { SlashCommandBuilder } from 'discord.js';

import { triggerSetCommandData, set } from './set.js';
import { triggerRmCommandData, rm } from './rm.js';
import { Response } from 'express';
import { logger } from '../../../logger.js';
import { notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

const builder = new SlashCommandBuilder()
  .setDescription(t('trigger.description'))
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
  .setContexts(
    InteractionContextType.BotDM,
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  )
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('set').setDescription(t('trigger.sub.set.description')),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('rm').setDescription(t('trigger.sub.rm.description')),
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

export type triggerDataOpts = triggerSetCommandData | triggerRmCommandData;

export const trigger: SlashCommandDeclaration<triggerDataOpts> = {
  builder,
  handler: async function (handlerOpts) {
    const { req, res } = handlerOpts;

    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

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
      case 'set':
        result = await set(<any>handlerOpts, <any>req.body.data?.options[0]);
        break;
      case 'rm':
        result = await rm(<any>handlerOpts, <any>req.body.data?.options[0]);
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
