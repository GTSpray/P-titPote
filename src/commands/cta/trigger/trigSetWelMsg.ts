import * as z from 'zod';
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import type { EntityManager } from '@mikro-orm/core';
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
  GuildTriggerKind,
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
import { triggerKindLabel } from '../../../trigger/triggerKindLabel.js';

const ValidWelMsg = z.object({
  name: triggerNameSchema,
  channelId: z.string().min(1).max(50),
  message: z.string().min(1).max(2000),
});

type WelMsgInput = z.infer<typeof ValidWelMsg>;

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

const applyMessageConfig = (
  trigger: GuildTrigger,
  { channelId, message }: Pick<WelMsgInput, 'channelId' | 'message'>,
) => {
  if (trigger.messageConfig) {
    trigger.messageConfig.channelId = channelId;
    trigger.messageConfig.message = message;
    return;
  }
  const messageConfig = new TriggerMessage(channelId, message);
  messageConfig.trigger = trigger;
  trigger.messageConfig = messageConfig;
};

const updateWelcomeMessage = async (
  em: EntityManager,
  guildId: string,
  input: WelMsgInput,
) => {
  const trigger = await em.findOne(
    GuildTrigger,
    {
      server: { guildId },
      name: input.name,
      kind: GuildTriggerKind.WelcomeMessage,
    },
    { populate: ['messageConfig', 'roleConfig'] },
  );
  if (!trigger) {
    return errorPayload(t('trigger.lifecycle.notFound', { name: input.name }));
  }

  const channelError = await ensurePostableChannel(guildId, input.channelId);
  if (channelError) {
    return channelError;
  }

  applyMessageConfig(trigger, input);
  await em.persist(trigger).flush();
  return okConfirm(
    t('trigger.lifecycle.updated', { name: input.name }),
    input.name,
  );
};

const createWelcomeMessage = async (
  em: EntityManager,
  guildId: string,
  input: WelMsgInput,
) => {
  const guild = await findOrCreateGuild(em, guildId);
  await em.populate(guild, [
    'triggers',
    'triggers.messageConfig',
    'triggers.roleConfig',
  ]);

  if (guild.triggers.find((trigger) => trigger.name === input.name)) {
    return errorPayload(t('trigger.create.nameTaken', { name: input.name }));
  }
  if (guild.triggers.length >= TRIGGER_LIMIT) {
    return errorPayload(t('errors.tooMany'));
  }

  const channelError = await ensurePostableChannel(guildId, input.channelId);
  if (channelError) {
    return channelError;
  }

  const trigger = new GuildTrigger(input.name, GuildTriggerKind.WelcomeMessage);
  applyMessageConfig(trigger, input);
  guild.triggers.add(trigger);

  await em.persist(guild).flush();
  return okConfirm(
    t('trigger.lifecycle.created', {
      name: input.name,
      kind: triggerKindLabel(GuildTriggerKind.WelcomeMessage),
    }),
    input.name,
  );
};

export const trigSetWelMsg: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, dbServices, additionalData }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    if (!dbServices || !guildId) {
      return res.status(500).json({ error: t('errors.unmetResult') });
    }

    const { data } = req.body;
    // Update CTAs put the trigger name in custom_id (`d.n`); create CTAs omit it
    // and collect the name from the modal field instead.
    const cta = (additionalData as CTAEnvelope<{ n?: string }>).d;
    const isUpdate = cta.n !== undefined;
    const name =
      cta.n ??
      getInputComponnentById<ComponentSimple>(data, 'name')?.component.value;
    const parsed = ValidWelMsg.safeParse({
      name,
      channelId: getInputComponnentById<ComponentSelect>(data, 'channel')
        ?.component.values[0],
      message: getInputComponnentById<ComponentSimple>(data, 'message')
        ?.component.value,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues;
      logger.debug('zod errors', { issues });
      return res
        .status(400)
        .json({ error: t('errors.invalidSubcommandPayload'), issues });
    }

    const em = dbServices.orm.em.fork();
    const payload = isUpdate
      ? await updateWelcomeMessage(em, guildId, parsed.data)
      : await createWelcomeMessage(em, guildId, parsed.data);

    return res.json(payload);
  },
};
