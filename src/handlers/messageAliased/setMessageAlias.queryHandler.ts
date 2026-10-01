import type { EntityManager } from '@mikro-orm/core';
import { findOrCreateGuild } from '../../db/services/discordGuild.service.js';
import type { Lister, Persister } from '../../db/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';
import { SetMessageAliasQuery } from '../../queries/setMessageAlias.query.js';
import { MessageAliasComputer } from './messageAlias.computer.js';
import type { MessageAliasedListCriteria } from '../../repositories/messageAliased/messageAliased.lister.js';

export type MessageAliasSetRepository = Lister<
  MessageAliasEntity,
  MessageAliasedListCriteria
> &
  Persister<MessageAliasEntity>;

export class SetMessageAliasQueryHandler {
  constructor(
    private em: EntityManager,
    private messageAliasRepository: MessageAliasSetRepository,
    private computer: MessageAliasComputer,
  ) {}

  async handle(query: SetMessageAliasQuery): Promise<MessageAliasEntity> {
    const guild = await findOrCreateGuild(this.em, query.guildId);
    const existingList = await this.messageAliasRepository.list({
      guildId: query.guildId,
    });

    const messageAliased = this.computer.compute(query, {
      existingList,
      serverId: guild.id,
    });

    await this.messageAliasRepository.persist(messageAliased);
    await this.em.flush();

    return messageAliased;
  }
}
