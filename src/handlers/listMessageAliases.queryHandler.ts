import { Lister } from '../db/repository.js';
import { MessageAliasEntity } from '../entities/messageAlias.entity.js';
import { ListMessageAliasesQuery } from '../queries/listMessageAliases.query.js';
import { MessageAliasedListCriteria } from '../repositories/messageAliased/messageAliased.lister.js';

export class ListMessageAliasesQueryHandler {
  constructor(
    private lister: Lister<MessageAliasEntity, MessageAliasedListCriteria>,
  ) {}

  async handle(query: ListMessageAliasesQuery): Promise<MessageAliasEntity[]> {
    return this.lister.list({ guildId: query.guildId });
  }
}
