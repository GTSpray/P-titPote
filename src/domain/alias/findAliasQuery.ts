import * as z from 'zod';
import type { TryFinder } from '../../cqrs/contracts.js';
import { validatePayload } from '../../cqrs/validatePayload.js';
import type { MessageAliased } from '../../entities/messageAliased.js';
import type { MessageAliasedCriteria } from '../../db/model/messageAliased.js';

const schema = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
});

export class FindAliasQuery {
  readonly alias: string;

  constructor(
    payload: Record<string, unknown>,
    readonly guildId: string,
  ) {
    const data = validatePayload(payload, schema, false);
    this.alias = data.alias;
  }
}

export class FindAliasQueryHandler {
  constructor(
    private aliases: TryFinder<MessageAliased, MessageAliasedCriteria>,
  ) {}

  handle(query: FindAliasQuery): Promise<MessageAliased | null> {
    return this.aliases.find({
      guildId: query.guildId,
      alias: query.alias,
    });
  }
}
