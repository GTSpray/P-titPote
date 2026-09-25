import type { EntityManager } from '@mikro-orm/core';
import { MessageAliased } from '../../db/entities/MessageAliased.entity.js';
import type { Remover } from '../../db/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';

export function createMessageAliasedRemover(
  em: EntityManager,
): Remover<MessageAliasEntity> {
  return {
    async remove(entity) {
      const record = await em.findOneOrFail(MessageAliased, { id: entity.id });
      record.deletedAt = new Date();
      em.persist(record);
    },
  };
}
