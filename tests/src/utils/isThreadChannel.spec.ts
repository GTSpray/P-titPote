import { ChannelType } from 'discord-api-types/v10';
import {
  isArchivedThreadChannel,
  isThreadChannel,
} from '../../../src/utils/isThreadChannel.js';

describe('isThreadChannel', () => {
  it('should accept public threads', () => {
    expect(isThreadChannel({ type: ChannelType.PublicThread })).toBe(true);
  });

  it('should reject text channels', () => {
    expect(isThreadChannel({ type: ChannelType.GuildText })).toBe(false);
  });
});

describe('isArchivedThreadChannel', () => {
  it('should be true when thread_metadata.archived is true', () => {
    expect(
      isArchivedThreadChannel({
        type: ChannelType.PublicThread,
        thread_metadata: { archived: true },
      }),
    ).toBe(true);
  });

  it('should be false when the thread is not archived', () => {
    expect(
      isArchivedThreadChannel({
        type: ChannelType.PublicThread,
        thread_metadata: { archived: false },
      }),
    ).toBe(false);
  });

  it('should be false for non-thread channels', () => {
    expect(
      isArchivedThreadChannel({
        type: ChannelType.GuildText,
        thread_metadata: { archived: true },
      }),
    ).toBe(false);
  });
});
