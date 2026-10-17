import { v4 } from 'uuid';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';
import { SetMessageAliasQuery } from '../../queries/setMessageAlias.query.js';
import { MessageAliasLimitReachedError } from '../../errors/messageAlias.errors.js';

/** Max active aliases per guild. */
export const ALIAS_LIMIT = 20;

/** Mirrors EntityBase's "not deleted" sentinel default. */
const NOT_DELETED_AT = new Date('1970-01-01T00:00:00.000Z');

export class MessageAliasComputer {
  compute(
    query: SetMessageAliasQuery,
    context: { existingList: MessageAliasEntity[]; serverId: string },
  ): MessageAliasEntity {
    const existing = context.existingList.find(
      (aliasedMsg) => aliasedMsg.alias === query.alias,
    );

    if (existing) {
      return {
        ...existing,
        message: query.message,
        updatedAt: new Date(),
      };
    }

    if (context.existingList.length >= ALIAS_LIMIT) {
      throw new MessageAliasLimitReachedError();
    }

    const now = new Date();
    return {
      id: v4(),
      alias: query.alias,
      message: query.message,
      serverId: context.serverId,
      createdAt: now,
      updatedAt: now,
      deletedAt: NOT_DELETED_AT,
    };
  }
}
