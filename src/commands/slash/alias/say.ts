import * as z from 'zod';
import { Response } from 'express';
import { CommandHandlerOptions, SubCommandOption } from '../../commands.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { logger } from '../../../logger.js';
import { MessageAliased } from '../../../db/entities/MessageAliased.entity.js';
import { errorPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

export interface aliasSayCommandData {
  id: string;
  name: string;
  options: [aliasSaySubCommandData];
  type: number;
}

export type aliasSaySubCommandData = {
  name: 'say';
  options: [SubCommandOption<'alias', string>];
  type: number;
};

const ValidAliasMessage = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
});

export const say = async (
  { req, res, dbServices }: CommandHandlerOptions<aliasSayCommandData>,
  subcommand: aliasSaySubCommandData,
): Promise<Response | null> => {
  const guildId = req.body.guild_id;
  const [alias] = subcommand.options;

  const AliasMessageInput = ValidAliasMessage.safeParse({
    alias: alias.value,
  });

  if (!AliasMessageInput.success) {
    const issues = AliasMessageInput.error.issues;
    logger.debug('zod errors', { issues });
    return res
      .status(400)
      .json({ error: t('errors.invalidSubcommandPayload'), issues });
  }

  if (dbServices && guildId) {
    const em = dbServices.orm.em.fork();

    const messageAliased = await em.findOne(MessageAliased, {
      server: { guildId },
      alias: AliasMessageInput.data.alias,
    });

    if (messageAliased) {
      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.IsComponentsV2,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: messageAliased.message,
            },
          ],
        },
      });
    } else {
      return res.json(
        errorPayload(
          t('alias.say.notFound', {
            alias: AliasMessageInput.data.alias,
          }),
        ),
      );
    }
  }

  return null;
};
