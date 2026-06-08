import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';
import { t } from '../i18n/index.js';

export const errorPayload = (content: string) => ({
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    flags: InteractionResponseFlags.EPHEMERAL,
    content,
  },
});

export const notFoundPayload = () => errorPayload(t('common.notFound'));

export const notAllowed = () => errorPayload(t('common.notAllowed'));

export const doNotUpdatePublishedPoll = () =>
  errorPayload(t('common.doNotUpdatePublishedPoll'));

export const foundItComponnents = () => [
  {
    type: MessageComponentTypes.TEXT_DISPLAY,
    content: t('common.foundIt'),
  },
  {
    type: MessageComponentTypes.SEPARATOR,
    divider: true,
    spacing: 1,
  },
];

export const okComponnents = () => [
  {
    type: MessageComponentTypes.TEXT_DISPLAY,
    content: t('common.ok'),
  },
];
