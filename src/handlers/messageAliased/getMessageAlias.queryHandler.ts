import type { Finder } from '../../db/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';
import { GetMessageAliasQuery } from '../../queries/getMessageAlias.query.js';
import type { MessageAliasedCriteria } from '../../repositories/messageAliased/messageAliased.finder.js';

export type MessageAliasGetRepository = Finder<
  MessageAliasEntity,
  MessageAliasedCriteria
>;

export class GetMessageAliasQueryHandler {
  constructor(private messageAliasRepository: MessageAliasGetRepository) {}

  async handle(query: GetMessageAliasQuery): Promise<MessageAliasEntity> {
    return this.messageAliasRepository.findOrFail({
      guildId: query.guildId,
      alias: query.alias,
    });
  }
}
