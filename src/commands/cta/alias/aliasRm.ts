import * as z from 'zod';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import {
  ComponentSelect,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import {
  errorPayload,
  notAllowed,
  okComponnents,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { RemoveMessageAliasCommand } from '../../../cmds/removeMessageAlias.command.js';
import { RemoveMessageAliasCommandHandler } from '../../../handlers/removeMessageAlias.commandHandler.js';
import { MessageAliasNotFoundError } from '../../../errors/messageAlias.errors.js';
import { createMessageAliasedFinder } from '../../../repositories/messageAliased/messageAliased.finder.js';
import { createMessageAliasedRemover } from '../../../repositories/messageAliased/messageAliased.remover.js';

export const aliasRm: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    const { data } = req.body;

    const aliasInput = getInputComponnentById<ComponentSelect>(data, 'alias');

    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const handler = new RemoveMessageAliasCommandHandler(
        em,
        createMessageAliasedFinder(em),
        createMessageAliasedRemover(em),
      );

      try {
        const command = new RemoveMessageAliasCommand({
          guildId,
          alias: aliasInput?.component.values[0],
        });

        await handler.handle(command);

        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            flags: MessageFlags.IsComponentsV2,
            components: [...okComponnents()],
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues;
          logger.debug('zod errors', { issues });
          return res
            .status(400)
            .json({ error: t('errors.invalidSubcommandPayload'), issues });
        }
        if (error instanceof MessageAliasNotFoundError) {
          return res.json(
            errorPayload(t('alias.rm.notFound', { alias: error.alias })),
          );
        }
        throw error;
      }
    }

    return res.status(500).json({
      error: t('errors.unmetResult'),
    });
  },
};
