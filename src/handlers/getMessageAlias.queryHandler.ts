import { Finder } from '../db/repository.js';
import { MessageAliasEntity } from '../entities/messageAlias.entity.js';
import { GetMessageAliasQuery } from '../queries/getMessageAlias.query.js';

export class GetMessageAliasQueryHandler {
  constructor(
    private finder: Finder<
      MessageAliasEntity,
      { guildId: string; alias: string }
    >,
  ) {}

  async handle(query: GetMessageAliasQuery): Promise<MessageAliasEntity> {
    return this.finder.findOrFail({
      guildId: query.guildId,
      alias: query.alias,
    });
  }
}
