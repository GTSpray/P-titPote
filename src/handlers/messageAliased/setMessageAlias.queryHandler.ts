import type { EntityManager } from '@mikro-orm/core';
import { findOrCreateGuild } from '../../db/services/discordGuild.service.js';
import { Lister, Persister } from '../../db/repository.js';
import { MessageAliasEntity } from '../../entities/messageAlias.entity.js';
import { SetMessageAliasQuery } from '../../queries/setMessageAlias.query.js';
import { MessageAliasComputer } from './messageAlias.computer.js';
import { MessageAliasedListCriteria } from '../../repositories/messageAliased/messageAliased.lister.js';

export class SetMessageAliasQueryHandler {
  constructor(
    private em: EntityManager,
    private lister: Lister<MessageAliasEntity, MessageAliasedListCriteria>,
    private persister: Persister<MessageAliasEntity>,
    private computer: MessageAliasComputer,
  ) {}

  async handle(query: SetMessageAliasQuery): Promise<MessageAliasEntity> {
    const guild = await findOrCreateGuild(this.em, query.guildId);
    const existingList = await this.lister.list({ guildId: query.guildId });

    const messageAliased = this.computer.compute(query, {
      existingList,
      serverId: guild.id,
    });

    await this.persister.persist(messageAliased);
    await this.em.flush();

    return messageAliased;
  }
}
