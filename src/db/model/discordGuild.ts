import type { Finder, Persister, TryFinder } from '../../cqrs/contracts.js';
import { NotFoundError } from '../../cqrs/errors.js';
import type { DiscordGuild } from '../../entities/discordGuild.js';
import { DiscordGuild as DiscordGuildModel } from '../entities/DiscordGuild.entity.js';
import { discordGuildToEntity } from './mapToEntity.js';
import { resolveEm } from './session.js';
import type { Transaction } from '../../cqrs/transaction.js';

export type DiscordGuildCriteria = {
  guildId: string;
};

async function loadGuild(
  criteria: DiscordGuildCriteria,
  transaction?: Transaction,
): Promise<DiscordGuildModel | null> {
  const em = await resolveEm(transaction);
  return em.findOne(DiscordGuildModel, { guildId: criteria.guildId });
}

export const DiscordGuildTryFinder: TryFinder<
  DiscordGuild,
  DiscordGuildCriteria
> = {
  async find(criteria, transaction) {
    const model = await loadGuild(criteria, transaction);
    return model ? discordGuildToEntity(model) : null;
  },
};

export const DiscordGuildFinder: Finder<DiscordGuild, DiscordGuildCriteria> = {
  async findOrFail(criteria, transaction) {
    const guild = await DiscordGuildTryFinder.find(criteria, transaction);
    if (!guild) {
      throw new NotFoundError('Guild does not exist', criteria);
    }
    return guild;
  },
};

export const DiscordGuildPersister: Persister<DiscordGuild> = {
  async persist(guild, transaction) {
    const em = await resolveEm(transaction);
    let model = await em.findOne(DiscordGuildModel, { id: guild.id });
    if (!model) {
      model = await em.findOne(DiscordGuildModel, { guildId: guild.guildId });
    }
    if (!model) {
      model = new DiscordGuildModel(guild.guildId);
      model.id = guild.id;
    }
    em.persist(model);
    await em.flush();
  },
};
