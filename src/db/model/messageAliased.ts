import type {
  Counter,
  Finder,
  Lister,
  Persister,
  Remover,
  TryFinder,
} from '../../cqrs/contracts.js';
import { NotFoundError } from '../../cqrs/errors.js';
import type { MessageAliased } from '../../entities/messageAliased.js';
import { DiscordGuild as DiscordGuildModel } from '../entities/DiscordGuild.entity.js';
import { MessageAliased as MessageAliasedModel } from '../entities/MessageAliased.entity.js';
import { messageAliasedToEntity } from './mapToEntity.js';
import { resolveEm } from './session.js';

export type MessageAliasedCriteria = {
  guildId: string;
  alias?: string;
  id?: string;
};

function whereFrom(criteria: MessageAliasedCriteria) {
  return {
    ...(criteria.id ? { id: criteria.id } : {}),
    ...(criteria.alias ? { alias: criteria.alias } : {}),
    server: { guildId: criteria.guildId },
  };
}

export const MessageAliasedTryFinder: TryFinder<
  MessageAliased,
  MessageAliasedCriteria
> = {
  async find(criteria, transaction) {
    const em = await resolveEm(transaction);
    const model = await em.findOne(MessageAliasedModel, whereFrom(criteria), {
      populate: ['server'],
    });
    return model ? messageAliasedToEntity(model) : null;
  },
};

export const MessageAliasedFinder: Finder<
  MessageAliased,
  MessageAliasedCriteria
> = {
  async findOrFail(criteria, transaction) {
    const alias = await MessageAliasedTryFinder.find(criteria, transaction);
    if (!alias) {
      throw new NotFoundError('Alias does not exist', criteria);
    }
    return alias;
  },
};

export const MessageAliasedLister: Lister<
  MessageAliasedCriteria,
  MessageAliased
> = {
  async list(criteria, options, transaction) {
    const em = await resolveEm(transaction);
    const models = await em.findAll(MessageAliasedModel, {
      where: whereFrom(criteria),
      orderBy: { alias: 'asc' },
      populate: ['server'],
      ...(options?.limit ? { limit: options.limit } : {}),
    });
    return { items: models.map(messageAliasedToEntity) };
  },
};

export const MessageAliasedCounter: Counter<MessageAliasedCriteria> = {
  async count(criteria, transaction) {
    const em = await resolveEm(transaction);
    return em.count(MessageAliasedModel, whereFrom(criteria));
  },
};

export const MessageAliasedPersister: Persister<MessageAliased> = {
  async persist(alias, transaction) {
    const em = await resolveEm(transaction);
    const guild = await em.findOneOrFail(DiscordGuildModel, {
      guildId: alias.guildId,
    });
    let model = await em.findOne(MessageAliasedModel, { id: alias.id });
    if (!model) {
      model = new MessageAliasedModel(alias.alias, alias.message);
      model.id = alias.id;
      model.server = guild;
    }
    model.alias = alias.alias;
    model.message = alias.message;
    model.deletedAt = alias.deletedAt;
    em.persist(model);
    await em.flush();
  },
};

export const MessageAliasedRemover: Remover<MessageAliased> = {
  async remove(alias, transaction) {
    await MessageAliasedPersister.persist(
      { ...alias, deletedAt: new Date() },
      transaction,
    );
  },
};
