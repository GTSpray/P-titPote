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
import { BadRequestError } from '../../../cqrs/errors.js';
import {
  MessageAliasedRemover,
  MessageAliasedTryFinder,
} from '../../../db/model/index.js';
import {
  RemoveAliasCommand,
  RemoveAliasCommandHandler,
} from '../../../domain/alias/removeAliasCommand.js';

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

    if (!dbServices || !guildId) {
      return res.status(500).json({
        error: t('errors.unmetResult'),
      });
    }

    try {
      const command = new RemoveAliasCommand(
        { alias: aliasInput?.component.values[0] },
        guildId,
      );
      const removed = await new RemoveAliasCommandHandler({
        ...MessageAliasedTryFinder,
        ...MessageAliasedRemover,
      }).handle(command);

      if (!removed) {
        return res.json(
          errorPayload(
            t('alias.rm.notFound', {
              alias: command.alias,
            }),
          ),
        );
      }

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.IsComponentsV2,
          components: [...okComponnents()],
        },
      });
    } catch (error) {
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
