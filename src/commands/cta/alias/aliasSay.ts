import * as z from 'zod';
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
import { GetMessageAliasQuery } from '../../../queries/getMessageAlias.query.js';
import { GetMessageAliasQueryHandler } from '../../../handlers/getMessageAlias.queryHandler.js';
import { MessageAliasNotFoundError } from '../../../errors/messageAlias.errors.js';
import { createMessageAliasedFinder } from '../../../repositories/messageAliased/messageAliased.finder.js';

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

    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const handler = new GetMessageAliasQueryHandler(
        createMessageAliasedFinder(em),
      );

      try {
        const query = new GetMessageAliasQuery({
          guildId,
          alias: aliasInput?.component.values[0],
        });

        const messageAliased = await handler.handle(query);

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
            errorPayload(t('alias.say.notFound', { alias: error.alias })),
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
