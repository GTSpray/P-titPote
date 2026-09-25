import type { EntityManager } from '@mikro-orm/core';
import { MessageAliased } from '../../db/entities/MessageAliased.entity.js';
import { DiscordGuild } from '../../db/entities/DiscordGuild.entity.js';
import type { Persister } from '../../db/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';

export function createMessageAliasedPersister(
  em: EntityManager,
): Persister<MessageAliasEntity> {
  return {
    async persist(entity) {
      let record = await em.findOne(MessageAliased, { id: entity.id });
      if (!record) {
        record = new MessageAliased(entity.alias, entity.message);
        record.id = entity.id;
        record.server = em.getReference(DiscordGuild, entity.serverId);
      }
      record.alias = entity.alias;
      record.message = entity.message;
      record.deletedAt = entity.deletedAt;
      em.persist(record);
    },
  };
}
