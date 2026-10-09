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
import { BadRequestError, TooManyError } from '../../../cqrs/errors.js';
import {
  DiscordGuildPersister,
  DiscordGuildTryFinder,
  MessageAliasedLister,
  MessageAliasedPersister,
} from '../../../db/model/index.js';
import {
  SetAliasCommand,
  SetAliasCommandHandler,
} from '../../../domain/alias/setAliasCommand.js';

export { ALIAS_LIMIT } from '../../../domain/alias/aliasQuotaComputer.js';

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

    if (!dbServices || !guildId) {
      return res.status(500).json({
        error: t('errors.unmetResult'),
      });
    }

    try {
      const command = new SetAliasCommand(
        {
          alias: aliasInput?.component.value,
          message: messageInput?.component.value,
        },
        guildId,
      );
      const handler = new SetAliasCommandHandler(
        { ...DiscordGuildTryFinder, ...DiscordGuildPersister },
        { ...MessageAliasedLister, ...MessageAliasedPersister },
      );
      await handler.handle(command);
      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.IsComponentsV2,
          components: [...okComponnents()],
        },
      });
    } catch (error) {
      if (error instanceof TooManyError) {
        return res.json(errorPayload(t('errors.tooMany')));
      }
      if (error instanceof BadRequestError) {
        const issues = error.details ?? [];
        logger.debug('zod errors', { issues });
        return res
          .status(400)
          .json({ error: t('errors.invalidSubcommandPayload'), issues });
      }
      throw error;
    }
  },
};
