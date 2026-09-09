import * as z from 'zod';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import {
  ComponentSelect,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { MessageAliased } from '../../../db/entities/MessageAliased.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import {
  errorPayload,
  notAllowed,
  okComponnents,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

const ValidAliasMessage = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
});

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

    const AliasMessageInput = ValidAliasMessage.safeParse({
      alias: aliasInput?.component.values[0],
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
        messageAliased.deletedAt = new Date();
        await em.persist(messageAliased).flush();
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            flags: MessageFlags.IsComponentsV2,
            components: [...okComponnents()],
          },
        });
      }

      return res.json(
        errorPayload(
          t('alias.rm.notFound', {
            alias: AliasMessageInput.data.alias,
          }),
        ),
      );
    }

    return res.status(500).json({
      error: t('errors.unmetResult'),
    });
  },
};
