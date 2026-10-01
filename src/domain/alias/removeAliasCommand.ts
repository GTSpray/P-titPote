import * as z from 'zod';
import type { Remover, TryFinder } from '../../cqrs/contracts.js';
import type { TransactionRunner } from '../../cqrs/transaction.js';
import { validatePayload } from '../../cqrs/validatePayload.js';
import type { MessageAliased } from '../../entities/messageAliased.js';
import type { MessageAliasedCriteria } from '../../db/model/messageAliased.js';
import { withTransaction } from '../../db/model/session.js';

const schema = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
});

export class RemoveAliasCommand {
  readonly alias: string;

  constructor(
    payload: Record<string, unknown>,
    readonly guildId: string,
  ) {
    const data = validatePayload(payload, schema, false);
    this.alias = data.alias;
  }
}

export class RemoveAliasCommandHandler {
  constructor(
    private aliases: TryFinder<MessageAliased, MessageAliasedCriteria> &
      Remover<MessageAliased>,
    private runInTransaction: TransactionRunner = withTransaction,
  ) {}

  async handle(command: RemoveAliasCommand): Promise<MessageAliased | null> {
    const alias = await this.aliases.find({
      guildId: command.guildId,
      alias: command.alias,
    });
    if (!alias) {
      return null;
    }
    await this.runInTransaction(async (transaction) => {
      await this.aliases.remove(alias, transaction);
    });
    return alias;
  }
}
