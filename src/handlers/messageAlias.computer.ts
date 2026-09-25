import { v4 } from 'uuid';
import { MessageAliasEntity } from '../entities/messageAlias.entity.js';
import { SetMessageAliasCommand } from '../cmds/setMessageAlias.command.js';
import { MessageAliasLimitReachedError } from '../errors/messageAlias.errors.js';

/** Max active aliases per guild. */
export const ALIAS_LIMIT = 20;

/** Mirrors EntityBase's "not deleted" sentinel default. */
const NOT_DELETED_AT = new Date('1970-01-01T00:00:00.000Z');

export class MessageAliasComputer {
  compute(
    command: SetMessageAliasCommand,
    context: { existingList: MessageAliasEntity[]; serverId: string },
  ): MessageAliasEntity {
    const existing = context.existingList.find(
      (aliasedMsg) => aliasedMsg.alias === command.alias,
    );

    if (existing) {
      return {
        ...existing,
        message: command.message,
        updatedAt: new Date(),
      };
    }

    if (context.existingList.length >= ALIAS_LIMIT) {
      throw new MessageAliasLimitReachedError();
    }

    const now = new Date();
    return {
      id: v4(),
      alias: command.alias,
      message: command.message,
      serverId: context.serverId,
      createdAt: now,
      updatedAt: now,
      deletedAt: NOT_DELETED_AT,
    };
  }
}
