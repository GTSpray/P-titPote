import type { EntityManager } from '@mikro-orm/core';
import { Finder, Remover } from '../db/repository.js';
import { MessageAliasEntity } from '../entities/messageAlias.entity.js';
import { RemoveMessageAliasCommand } from '../cmds/removeMessageAlias.command.js';

export class RemoveMessageAliasCommandHandler {
  constructor(
    private em: EntityManager,
    private finder: Finder<
      MessageAliasEntity,
      { guildId: string; alias: string }
    >,
    private remover: Remover<MessageAliasEntity>,
  ) {}

  async handle(command: RemoveMessageAliasCommand): Promise<void> {
    const existing = await this.finder.findOrFail({
      guildId: command.guildId,
      alias: command.alias,
    });

    await this.remover.remove(existing);
    await this.em.flush();
  }
}
