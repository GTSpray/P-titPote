import type { EntityManager } from '@mikro-orm/core';
import type { Finder, Remover } from '../../repositories/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';
import { RemoveMessageAliasQuery } from '../../queries/removeMessageAlias.query.js';
import type { MessageAliasedCriteria } from '../../repositories/messageAliased/messageAliased.finder.js';

export type MessageAliasRemoveRepository = Finder<
  MessageAliasEntity,
  MessageAliasedCriteria
> &
  Remover<MessageAliasEntity>;

export class RemoveMessageAliasQueryHandler {
  constructor(
    private em: EntityManager,
    private messageAliasRepository: MessageAliasRemoveRepository,
  ) {}

  async handle(query: RemoveMessageAliasQuery): Promise<void> {
    const existing = await this.messageAliasRepository.findOrFail({
      guildId: query.guildId,
      alias: query.alias,
    });

    await this.messageAliasRepository.remove(existing);
    await this.em.flush();
  }
}
