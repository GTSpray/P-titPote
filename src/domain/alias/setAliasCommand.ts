import * as z from 'zod';
import type { Persister, TryFinder } from '../../cqrs/contracts.js';
import type { TransactionRunner } from '../../cqrs/transaction.js';
import { validatePayload } from '../../cqrs/validatePayload.js';
import { newTimestamps } from '../../entities/common.js';
import type { DiscordGuild } from '../../entities/discordGuild.js';
import type { MessageAliased } from '../../entities/messageAliased.js';
import { v4 } from 'uuid';
import type { DiscordGuildCriteria } from '../../db/model/discordGuild.js';
import { withTransaction } from '../../db/model/session.js';
import {
  AliasQuotaComputer,
  type AliasQuotaContext,
} from './aliasQuotaComputer.js';
import type { Lister } from '../../cqrs/contracts.js';
import type { MessageAliasedCriteria } from '../../db/model/messageAliased.js';

const schema = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
  message: z.string().min(1).max(500),
});

export class SetAliasCommand {
  readonly alias: string;
  readonly message: string;

  constructor(
    payload: Record<string, unknown>,
    readonly guildId: string,
  ) {
    const data = validatePayload(payload, schema, false);
    this.alias = data.alias;
    this.message = data.message;
  }
}

export class SetAliasCommandHandler {
  constructor(
    private guilds: TryFinder<DiscordGuild, DiscordGuildCriteria> &
      Persister<DiscordGuild>,
    private aliases: Lister<MessageAliasedCriteria, MessageAliased> &
      Persister<MessageAliased>,
    private quota: ComputerLike = new AliasQuotaComputer(),
    private runInTransaction: TransactionRunner = withTransaction,
  ) {}

  async handle(command: SetAliasCommand): Promise<MessageAliased> {
    const listed = await this.aliases.list({ guildId: command.guildId });
    const current = listed.items.find((item) => item.alias === command.alias);
    const alias = current
      ? { ...current, message: command.message, updatedAt: new Date() }
      : {
          id: v4(),
          guildId: command.guildId,
          alias: command.alias,
          message: command.message,
          ...newTimestamps(),
        };
    const computed = await this.quota.compute(alias, {
      activeCount: listed.items.length,
      isNew: !current,
    });

    await this.runInTransaction(async (transaction) => {
      const guild = await this.guilds.find(
        { guildId: command.guildId },
        transaction,
      );
      if (!guild) {
        await this.guilds.persist(
          {
            id: v4(),
            guildId: command.guildId,
            ...newTimestamps(),
          },
          transaction,
        );
      }
      await this.aliases.persist(computed, transaction);
    });

    return computed;
  }
}

type ComputerLike = {
  compute(
    alias: MessageAliased,
    context: AliasQuotaContext,
  ): Promise<MessageAliased>;
};
