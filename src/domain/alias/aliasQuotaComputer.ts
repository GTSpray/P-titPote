import type { Computer } from '../../cqrs/contracts.js';
import { TooManyError } from '../../cqrs/errors.js';
import type { MessageAliased } from '../../entities/messageAliased.js';

/** Max active aliases per guild. */
export const ALIAS_LIMIT = 20;

export type AliasQuotaContext = {
  activeCount: number;
  isNew: boolean;
};

export class AliasQuotaComputer implements Computer<
  MessageAliased,
  AliasQuotaContext
> {
  async compute(
    alias: MessageAliased,
    context: AliasQuotaContext,
  ): Promise<MessageAliased> {
    if (context.isNew && context.activeCount >= ALIAS_LIMIT) {
      throw new TooManyError();
    }
    return alias;
  }
}
