import * as z from 'zod';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import {
  ComponentSimple,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { DiscordGuild } from '../../../db/entities/DiscordGuild.entity.js';
import { MessageAliased } from '../../../db/entities/MessageAliased.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { notAllowed, okComponnents } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

const ValidAliasMessage = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
  message: z.string().min(1).max(500),
});

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

    const AliasMessageInput = ValidAliasMessage.safeParse({
      alias: aliasInput?.component.value,
      message: messageInput?.component.value,
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

      const guild =
        (await em.findOne(
          DiscordGuild,
          { guildId },
          { populate: ['messageAliaseds'] },
        )) || new DiscordGuild(guildId);

      let messageAliased = guild.messageAliaseds.find(
        (aliasedMsg: MessageAliased) =>
          aliasedMsg.alias === AliasMessageInput.data.alias,
      );

      if (!messageAliased) {
        messageAliased = new MessageAliased(
          AliasMessageInput.data.alias,
          AliasMessageInput.data.message,
        );
        guild.messageAliaseds.add(messageAliased);
        await em.persist(guild).flush();
      }

      messageAliased.message = AliasMessageInput.data.message;

      await em.persist(messageAliased).flush();
      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.IsComponentsV2,
          components: [...okComponnents()],
        },
      });
    }

    return res.status(500).json({
      error: t('errors.unmetResult'),
    });
  },
};
