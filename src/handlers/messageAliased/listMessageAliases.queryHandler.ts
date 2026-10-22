import type { Lister } from '../../repositories/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';
import { ListMessageAliasesQuery } from '../../queries/listMessageAliases.query.js';
import type { MessageAliasedListCriteria } from '../../repositories/messageAliased/messageAliased.lister.js';

export type MessageAliasListRepository = Lister<
  MessageAliasEntity,
  MessageAliasedListCriteria
>;

export class ListMessageAliasesQueryHandler {
  constructor(private messageAliasRepository: MessageAliasListRepository) {}

  async handle(query: ListMessageAliasesQuery): Promise<MessageAliasEntity[]> {
    return this.messageAliasRepository.list({ guildId: query.guildId });
  }
}
