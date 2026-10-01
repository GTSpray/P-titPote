import type { APIChannel } from 'discord-api-types/v10';
import { ChannelType } from 'discord-api-types/v10';

const THREAD_CHANNEL_TYPES = new Set<ChannelType>([
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
]);

type ThreadLikeChannel = Pick<APIChannel, 'type'> & {
  thread_metadata?: { archived?: boolean } | null;
};

export function isThreadChannel(
  channel: Pick<APIChannel, 'type'> | null | undefined,
): boolean {
  return channel != null && THREAD_CHANNEL_TYPES.has(channel.type);
}

export function isArchivedThreadChannel(
  channel: ThreadLikeChannel | null | undefined,
): boolean {
  return (
    isThreadChannel(channel) && channel?.thread_metadata?.archived === true
  );
}
