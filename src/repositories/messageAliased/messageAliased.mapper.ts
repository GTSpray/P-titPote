import { MessageAliased } from '../../db/entities/MessageAliased.entity.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';

/** Only this module is allowed to know the MikroORM shape of MessageAliased. */
export function messageAliasedRecordToEntity(
  record: MessageAliased,
): MessageAliasEntity {
  return {
    id: record.id,
    alias: record.alias,
    message: record.message,
    serverId: record.server.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}
