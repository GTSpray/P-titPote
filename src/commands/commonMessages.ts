import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { t } from '../i18n/index.js';

export const errorPayload = (content: string) => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: {
    flags: MessageFlags.Ephemeral,
    content,
  },
});

/** Replace a message-component interaction’s message (clears selects by default). */
export const updateMessagePayload = (
  content: string,
  components: object[] = [],
) => ({
  type: InteractionResponseType.UpdateMessage,
  data: {
    content,
    components,
  },
});

export const notFoundPayload = () => errorPayload(t('common.notFound'));

export const notAllowed = () => errorPayload(t('common.notAllowed'));

export const doNotUpdatePublishedPoll = () =>
  errorPayload(t('common.doNotUpdatePublishedPoll'));

export const foundItComponnents = () => [
  {
    type: ComponentType.TextDisplay,
    content: t('common.foundIt'),
  },
  {
    type: ComponentType.Separator,
    divider: true,
    spacing: 1,
  },
];

export const okComponnents = () => [
  {
    type: ComponentType.TextDisplay,
    content: t('common.ok'),
  },
];
