import type { EntityManager } from '@mikro-orm/core';
import { MessageAliased } from '../../db/entities/MessageAliased.entity.js';
import type { Lister } from '../../db/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';
import { messageAliasedRecordToEntity } from './messageAliased.mapper.js';

export type MessageAliasedListCriteria = { guildId: string };

export function createMessageAliasedLister(
  em: EntityManager,
): Lister<MessageAliasEntity, MessageAliasedListCriteria> {
  return {
    async list({ guildId }) {
      const records = await em.findAll(MessageAliased, {
        where: { server: { guildId } },
        orderBy: { alias: 'asc' },
      });
      return records.map(messageAliasedRecordToEntity);
    },
  };
}
