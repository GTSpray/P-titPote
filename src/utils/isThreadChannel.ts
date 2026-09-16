import type { APIChannel } from 'discord-api-types/v10';
import { ChannelType } from 'discord-api-types/v10';

const THREAD_CHANNEL_TYPES = new Set<ChannelType>([
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
]);

export function isThreadChannel(
  channel: Pick<APIChannel, 'type'> | null | undefined,
): boolean {
  return channel != null && THREAD_CHANNEL_TYPES.has(channel.type);
}
