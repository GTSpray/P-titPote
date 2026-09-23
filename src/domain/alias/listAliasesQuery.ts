import type { Lister } from '../../cqrs/contracts.js';
import type { MessageAliased } from '../../entities/messageAliased.js';
import type { MessageAliasedCriteria } from '../../db/model/messageAliased.js';

export class ListAliasesQuery {
  constructor(readonly guildId: string) {}
}

export class ListAliasesQueryHandler {
  constructor(
    private aliases: Lister<MessageAliasedCriteria, MessageAliased>,
  ) {}

  async handle(query: ListAliasesQuery): Promise<MessageAliased[]> {
    const result = await this.aliases.list({ guildId: query.guildId });
    return result.items;
  }
}
