import { GuildTrigger } from '../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../src/db/entities/TriggerMessage.entity.js';

export const expectedTriggerMessage = (
  opts: Partial<TriggerMessage>,
): TriggerMessage => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    channelId: expect.any(String),
    message: expect.any(String),
    trigger: expect.any(GuildTrigger),
    ...opts,
  };
};
