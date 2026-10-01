import type { EntityManager } from '@mikro-orm/core';
import { Finder, Remover } from '../db/repository.js';
import { MessageAliasEntity } from '../entities/messageAlias.entity.js';
import { RemoveMessageAliasQuery } from '../queries/removeMessageAlias.query.js';

export class RemoveMessageAliasQueryHandler {
  constructor(
    private em: EntityManager,
    private finder: Finder<
      MessageAliasEntity,
      { guildId: string; alias: string }
    >,
    private remover: Remover<MessageAliasEntity>,
  ) {}

  async handle(query: RemoveMessageAliasQuery): Promise<void> {
    const existing = await this.finder.findOrFail({
      guildId: query.guildId,
      alias: query.alias,
    });

    await this.remover.remove(existing);
    await this.em.flush();
  }
}
