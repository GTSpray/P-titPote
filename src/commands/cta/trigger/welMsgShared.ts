import * as z from 'zod';
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { GuildTrigger } from '../../../db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../db/entities/TriggerMessage.entity.js';
import { logger } from '../../../logger.js';
import { errorPayload } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  assertBotCanPostInChannel,
  BotCannotPostInChannelError,
} from '../../../utils/assertBotCanPostInChannel.js';
import { triggerNameSchema } from '../../../shared/trigger/triggerName.js';

export const ValidWelMsg = z.object({
  name: triggerNameSchema,
  channelId: z.string().min(1).max(50),
  message: z.string().min(1).max(2000),
});

export type WelMsgInput = z.infer<typeof ValidWelMsg>;

export const ensurePostableChannel = async (
  guildId: string,
  channelId: string,
) => {
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

export const okWelMsgConfirm = (content: string, triggerName: string) => ({
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

export const applyMessageConfig = (
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
