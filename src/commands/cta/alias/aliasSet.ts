import * as z from 'zod';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import {
  ComponentSimple,
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
import { SetMessageAliasCommand } from '../../../cmds/setMessageAlias.command.js';
import { SetMessageAliasCommandHandler } from '../../../handlers/setMessageAlias.commandHandler.js';
import { MessageAliasComputer } from '../../../handlers/messageAlias.computer.js';
import { MessageAliasLimitReachedError } from '../../../errors/messageAlias.errors.js';
import { createMessageAliasedLister } from '../../../repositories/messageAliased/messageAliased.lister.js';
import { createMessageAliasedPersister } from '../../../repositories/messageAliased/messageAliased.persister.js';

export { ALIAS_LIMIT } from '../../../handlers/messageAlias.computer.js';

export const aliasSet: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    const { data } = req.body;

    const aliasInput = getInputComponnentById<ComponentSimple>(data, 'alias');
    const messageInput = getInputComponnentById<ComponentSimple>(
      data,
      'message',
    );

    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const handler = new SetMessageAliasCommandHandler(
        em,
        createMessageAliasedLister(em),
        createMessageAliasedPersister(em),
        new MessageAliasComputer(),
      );

      try {
        const command = new SetMessageAliasCommand({
          guildId,
          alias: aliasInput?.component.value,
          message: messageInput?.component.value,
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
        if (error instanceof MessageAliasLimitReachedError) {
          return res.json(errorPayload(t('errors.tooMany')));
        }
        throw error;
      }
    }

    return res.status(500).json({
      error: t('errors.unmetResult'),
    });
  },
};
