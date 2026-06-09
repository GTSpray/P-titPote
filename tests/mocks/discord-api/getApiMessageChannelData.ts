import type { RESTGetAPIChannelMessagesResult } from 'discord-api-types/v10';
import { getApiMessageData } from './getApiMessageData.js';
import { randomDiscordId19 } from './utils.js';

type ApiMessagesChannelDataOptions = {
  channel_id?: string;
  messages?: RESTGetAPIChannelMessagesResult;
  length?: number;
};
export const getApiMessagesChannelData = (
  options?: ApiMessagesChannelDataOptions,
): RESTGetAPIChannelMessagesResult => {
  const channel_id = options?.channel_id ?? randomDiscordId19();
  const messages = options?.messages ?? [];
  const length = options?.length ?? 3;
  return [
    ...Array.from({ length }, () => getApiMessageData({ channel_id })),
    ...messages,
  ];
};
