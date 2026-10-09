import { GuildTrigger } from '../../src/db/entities/GuildTrigger.entity.js';
import { TriggerRole } from '../../src/db/entities/TriggerRole.entity.js';

export const expectedTriggerRole = (
  opts: Partial<TriggerRole>,
): TriggerRole => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    roleId: expect.any(String),
    trigger: expect.any(GuildTrigger),
    ...opts,
  };
};
