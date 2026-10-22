import { DiscordGuild } from '../../src/db/entities/DiscordGuild.entity.js';
import { ThreadRemind } from '../../src/db/entities/ThreadRemind.entity.js';

export const expectedRemind = (opts: Partial<ThreadRemind>): ThreadRemind => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    server: expect.any(DiscordGuild),
    threadId: expect.any(String),
    ownerUserId: expect.any(String),
    idleDays: expect.any(Number),
    nextTickAt: expect.any(Date),
    lastBumpMessageId: expect.toBeOneOf([expect.any(String), null, undefined]),
    ...opts,
  };
};
