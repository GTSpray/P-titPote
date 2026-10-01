import * as z from 'zod';
import type { Persister, TryFinder } from '../../cqrs/contracts.js';
import type { TransactionRunner } from '../../cqrs/transaction.js';
import { validatePayload } from '../../cqrs/validatePayload.js';
import { newTimestamps } from '../../entities/common.js';
import type { DiscordGuild } from '../../entities/discordGuild.js';
import { v4 } from 'uuid';
import type { DiscordGuildCriteria } from '../../db/model/discordGuild.js';
import { withTransaction } from '../../db/model/session.js';

const schema = z.object({
  guildId: z.string().min(1).max(50),
});

export class EnsureGuildCommand {
  readonly guildId: string;

  constructor(payload: Record<string, unknown>) {
    const data = validatePayload(payload, schema, false);
    this.guildId = data.guildId;
  }
}

export class EnsureGuildCommandHandler {
  constructor(
    private guilds: TryFinder<DiscordGuild, DiscordGuildCriteria> &
      Persister<DiscordGuild>,
    private runInTransaction: TransactionRunner = withTransaction,
  ) {}

  async handle(command: EnsureGuildCommand): Promise<DiscordGuild> {
    const existing = await this.guilds.find({ guildId: command.guildId });
    if (existing) {
      return existing;
    }
    const guild: DiscordGuild = {
      id: v4(),
      guildId: command.guildId,
      ...newTimestamps(),
    };
    await this.runInTransaction(async (transaction) => {
      const again = await this.guilds.find(
        { guildId: command.guildId },
        transaction,
      );
      if (!again) {
        await this.guilds.persist(guild, transaction);
      }
    });
    return (await this.guilds.find({ guildId: command.guildId })) ?? guild;
  }
}
