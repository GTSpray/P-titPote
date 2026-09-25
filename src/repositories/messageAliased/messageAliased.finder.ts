import type { EntityManager } from '@mikro-orm/core';
import { MessageAliased } from '../../db/entities/MessageAliased.entity.js';
import type { Finder } from '../../db/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';
import { MessageAliasNotFoundError } from '../../errors/messageAlias.errors.js';
import { messageAliasedRecordToEntity } from './messageAliased.mapper.js';

export type MessageAliasedCriteria = { guildId: string; alias: string };

export function createMessageAliasedFinder(
  em: EntityManager,
): Finder<MessageAliasEntity, MessageAliasedCriteria> {
  return {
    async findOrFail({ guildId, alias }) {
      const record = await em.findOne(MessageAliased, {
        server: { guildId },
        alias,
      });
      if (!record) {
        throw new MessageAliasNotFoundError(alias);
      }
      return messageAliasedRecordToEntity(record);
    },
  };
}
