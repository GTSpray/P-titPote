import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import {
  ComponentSelect,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { BadRequestError } from '../../../cqrs/errors.js';
import { MessageAliasedTryFinder } from '../../../db/model/index.js';
import {
  FindAliasQuery,
  FindAliasQueryHandler,
} from '../../../domain/alias/findAliasQuery.js';

export const aliasSay: ModalHandlerDelcaration<CTAData> = {
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
      const query = new FindAliasQuery(
        { alias: aliasInput?.component.values[0] },
        guildId,
      );
      const alias = await new FindAliasQueryHandler(
        MessageAliasedTryFinder,
      ).handle(query);

      if (!alias) {
        return res.json(
          errorPayload(
            t('alias.say.notFound', {
              alias: query.alias,
            }),
          ),
        );
      }

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.IsComponentsV2,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: alias.message,
            },
          ],
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
