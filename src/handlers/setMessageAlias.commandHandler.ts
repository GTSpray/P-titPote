import type { EntityManager } from '@mikro-orm/core';
import { findOrCreateGuild } from '../db/services/discordGuild.service.js';
import { Lister, Persister } from '../db/repository.js';
import { MessageAliasEntity } from '../entities/messageAlias.entity.js';
import { SetMessageAliasCommand } from '../cmds/setMessageAlias.command.js';
import { MessageAliasComputer } from './messageAlias.computer.js';
import { MessageAliasedListCriteria } from '../repositories/messageAliased/messageAliased.lister.js';

export class SetMessageAliasCommandHandler {
  constructor(
    private em: EntityManager,
    private lister: Lister<MessageAliasEntity, MessageAliasedListCriteria>,
    private persister: Persister<MessageAliasEntity>,
    private computer: MessageAliasComputer,
  ) {}

  async handle(command: SetMessageAliasCommand): Promise<MessageAliasEntity> {
    const guild = await findOrCreateGuild(this.em, command.guildId);
    const existingList = await this.lister.list({ guildId: command.guildId });

    const messageAliased = this.computer.compute(command, {
      existingList,
      serverId: guild.id,
    });

    await this.persister.persist(messageAliased);
    await this.em.flush();

    return messageAliased;
  }
}
