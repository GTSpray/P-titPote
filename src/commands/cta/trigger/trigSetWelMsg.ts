import * as z from 'zod';
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import {
  ComponentSelect,
  ComponentSimple,
  CTAData,
  type CTAEnvelope,
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
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  assertBotCanPostInChannel,
  BotCannotPostInChannelError,
} from '../../../utils/assertBotCanPostInChannel.js';
import { triggerNameSchema } from '../../../trigger/triggerName.js';
import { GuildTriggerKind } from '../../../trigger/GuildTriggerKind.js';
import { triggerKindLabel } from '../../../trigger/triggerKindLabel.js';

const ensurePostableChannel = async (guildId: string, channelId: string) => {
  try {
    await assertBotCanPostInChannel(guildId, channelId);
    return null;
  } catch (error) {
    if (error instanceof BotCannotPostInChannelError) {
      return errorPayload(error.toUserMessage());
    }
    logger.error('trigger channel postability check failed', {
      guildId,
      channelId,
      error,
    });
    return errorPayload(t('trigger.channel.unavailable'));
  }
};

const ValidCreate = z.object({
  name: triggerNameSchema,
  channelId: z.string().min(1).max(50),
  message: z.string().min(1).max(2000),
});

const ValidUpdate = z.object({
  name: triggerNameSchema,
  channelId: z.string().min(1).max(50),
  message: z.string().min(1).max(2000),
});

const okConfirm = (content: string, triggerName: string) => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.TextDisplay,
        content,
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: t('trigger.lifecycle.previewButton'),
            custom_id: JSON.stringify({
              t: 'cta',
              d: { a: 'trigPreviewWelMsg', n: triggerName },
            }),
          },
        ],
      },
    ],
  },
});

export const trigSetWelMsg: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices, additionalData }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    const { data } = req.body;
    const { n: name } = (additionalData as CTAEnvelope<{ n?: string }>).d;

    const channelInput = getInputComponnentById<ComponentSelect>(
      data,
      'channel',
    );
    const messageInput = getInputComponnentById<ComponentSimple>(
      data,
      'message',
    );

    if (name !== undefined) {
      const parsed = ValidUpdate.safeParse({
        name,
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

      if (!dbServices || !guildId) {
        return res.status(500).json({
          error: t('errors.unmetResult'),
        });
      }

      const em = dbServices.orm.em.fork();
      const trigger = await em.findOne(
        GuildTrigger,
        {
          server: { guildId },
          name: parsed.data.name,
          kind: GuildTriggerKind.WelcomeMessage,
        },
        { populate: ['messageConfig', 'roleConfig'] },
      );

      if (!trigger) {
        return res.json(
          errorPayload(
            t('trigger.lifecycle.notFound', { name: parsed.data.name }),
          ),
        );
      }

      const channelError = await ensurePostableChannel(
        guildId,
        parsed.data.channelId,
      );
      if (channelError) {
        return res.json(channelError);
      }

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

      await em.persist(trigger).flush();
      return res.json(
        okConfirm(
          t('trigger.lifecycle.updated', { name: parsed.data.name }),
          parsed.data.name,
        ),
      );
    }

    const nameInput = getInputComponnentById<ComponentSimple>(data, 'name');
    const parsed = ValidCreate.safeParse({
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

      const existing = guild.triggers.find(
        (aTrigger) => aTrigger.name === parsed.data.name,
      );
      if (existing) {
        return res.json(
          errorPayload(
            t('trigger.create.nameTaken', { name: parsed.data.name }),
          ),
        );
      }

      if (guild.triggers.length >= TRIGGER_LIMIT) {
        return res.json(errorPayload(t('errors.tooMany')));
      }

      const channelError = await ensurePostableChannel(
        guildId,
        parsed.data.channelId,
      );
      if (channelError) {
        return res.json(channelError);
      }

      const trigger = new GuildTrigger(
        parsed.data.name,
        GuildTriggerKind.WelcomeMessage,
      );
      const messageConfig = new TriggerMessage(
        parsed.data.channelId,
        parsed.data.message,
      );
      messageConfig.trigger = trigger;
      trigger.messageConfig = messageConfig;
      guild.triggers.add(trigger);

      await em.persist(guild).flush();
      return res.json(
        okConfirm(
          t('trigger.lifecycle.created', {
            name: parsed.data.name,
            kind: triggerKindLabel(GuildTriggerKind.WelcomeMessage),
          }),
          parsed.data.name,
        ),
      );
    }

    return res.status(500).json({
      error: t('errors.unmetResult'),
    });
  },
};
