import { DiscordGuild } from '../../src/db/entities/DiscordGuild.entity.js';
import { GuildTrigger } from '../../src/db/entities/GuildTrigger.entity.js';

export const expectedGuildTrigger = (
  opts: Partial<GuildTrigger>,
): GuildTrigger => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    name: expect.any(String),
    kind: expect.any(String),
    enabled: expect.any(Boolean),
    messageConfig: null,
    roleConfig: null,
    server: expect.any(DiscordGuild),
    ...opts,
  };
};
