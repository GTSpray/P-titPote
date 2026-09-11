import type { EntityManager } from '@mikro-orm/core';
import { DiscordGuild } from '../entities/DiscordGuild.entity.js';

export async function findOrCreateGuild(
  em: EntityManager,
  guildId: string,
): Promise<DiscordGuild> {
  const existing = await em.findOne(DiscordGuild, { guildId });
  if (existing) {
    return existing;
  }

  const guild = new DiscordGuild(guildId);
  em.persist(guild);
  return guild;
}
