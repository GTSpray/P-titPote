import { describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../../../src/cqrs/transaction.js';
import { TooManyError } from '../../../../src/cqrs/errors.js';
import { newTimestamps } from '../../../../src/entities/common.js';
import type { MessageAliased } from '../../../../src/entities/messageAliased.js';
import { AliasQuotaComputer } from '../../../../src/domain/alias/aliasQuotaComputer.js';
import {
  SetAliasCommand,
  SetAliasCommandHandler,
} from '../../../../src/domain/alias/setAliasCommand.js';

const guildId = 'guild-1';

function alias(name: string): MessageAliased {
  return {
    id: name,
    guildId,
    alias: name,
    message: 'stored',
    ...newTimestamps(),
  };
}

describe('SetAliasCommandHandler', () => {
  it('creates a guild and alias inside one transaction', async () => {
    const transaction = {} as Transaction;
    const guilds = {
      find: vi.fn(async () => null),
      persist: vi.fn(async () => undefined),
    };
    const aliases = {
      list: vi.fn(async () => ({ items: [] })),
      persist: vi.fn(async () => undefined),
    };
    const runInTransaction = vi.fn(async (work) => work(transaction));
    const handler = new SetAliasCommandHandler(
      guilds,
      aliases,
      new AliasQuotaComputer(),
      runInTransaction,
    );

    const created = await handler.handle(
      new SetAliasCommand({ alias: 'hello', message: 'world' }, guildId),
    );

    expect(created.alias).toBe('hello');
    expect(created.message).toBe('world');
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(guilds.persist).toHaveBeenCalledWith(
      expect.objectContaining({ guildId }),
      transaction,
    );
    expect(aliases.persist).toHaveBeenCalledWith(
      expect.objectContaining({ alias: 'hello', message: 'world' }),
      transaction,
    );
  });

  it('refuses a new alias once the guild quota is reached', async () => {
    const aliases = {
      list: vi.fn(async () => ({
        items: Array.from({ length: 20 }, (_item, index) => alias(`a${index}`)),
      })),
      persist: vi.fn(async () => undefined),
    };
    const handler = new SetAliasCommandHandler(
      { find: vi.fn(), persist: vi.fn() },
      aliases,
      new AliasQuotaComputer(),
      vi.fn(),
    );

    await expect(
      handler.handle(
        new SetAliasCommand({ alias: 'next', message: 'nope' }, guildId),
      ),
    ).rejects.toBeInstanceOf(TooManyError);
    expect(aliases.persist).not.toHaveBeenCalled();
  });
});
