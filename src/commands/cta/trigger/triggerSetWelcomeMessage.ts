import * as z from 'zod';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import {
  ComponentSelect,
  ComponentSimple,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import {
  GuildTrigger,
  TRIGGER_LIMIT,
} from '../../../db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../db/entities/TriggerMessage.entity.js';
import { findOrCreateGuild } from '../../../db/services/discordGuild.service.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import {
  errorPayload,
  notAllowed,
  okComponnents,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

const ValidWelcomeMessage = z.object({
  name: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
  channelId: z.string().min(1).max(50),
  message: z.string().min(1).max(2000),
});

export const triggerSetWelcomeMessage: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    const { data } = req.body;

    const nameInput = getInputComponnentById<ComponentSimple>(data, 'name');
    const channelInput = getInputComponnentById<ComponentSelect>(
      data,
      'channel',
    );
    const messageInput = getInputComponnentById<ComponentSimple>(
      data,
      'message',
    );

    const parsed = ValidWelcomeMessage.safeParse({
      name: nameInput?.component.value,
      channelId: channelInput?.component.values[0],
      message: messageInput?.component.value,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const guild = await findOrCreateGuild(em, guildId);
      await em.populate(guild, [
        'triggers',
        'triggers.messageConfig',
        'triggers.roleConfig',
      ]);

      let trigger = guild.triggers.find(
        (aTrigger) => aTrigger.name === parsed.data.name,
      );

      if (!trigger) {
        if (guild.triggers.length >= TRIGGER_LIMIT) {
          return res.json(errorPayload(t('errors.tooMany')));
        }
        trigger = new GuildTrigger(parsed.data.name, 'welcome_message');
        guild.triggers.add(trigger);
      }

      trigger.kind = 'welcome_message';
      trigger.enabled = true;
      trigger.roleConfig = null;

      if (trigger.messageConfig) {
        trigger.messageConfig.channelId = parsed.data.channelId;
        trigger.messageConfig.message = parsed.data.message;
      } else {
        const messageConfig = new TriggerMessage(
          parsed.data.channelId,
          parsed.data.message,
        );
        messageConfig.trigger = trigger;
        trigger.messageConfig = messageConfig;
      }

      await em.persist(guild).flush();
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
