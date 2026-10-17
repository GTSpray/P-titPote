import type { EntityManager } from '@mikro-orm/core';
import { LockMode } from '@mikro-orm/core';
import { Poll } from '../../db/entities/Poll.entity.js';
import type { Finder } from '../repository.js';
import type { PollEntity } from '../../entities/poll.entity.js';
import { pollRecordToEntity } from './poll.mapper.js';

export type PollCriteria = { guildId: string; pollId: string };

export type PollLockingFinder = {
  findOrFailLocked(criteria: PollCriteria): Promise<PollEntity>;
};

export function createPollFinder(
  em: EntityManager,
): Finder<PollEntity, PollCriteria> {
  return {
    async findOrFail({ guildId, pollId }) {
      const record = await em.findOneOrFail(
        Poll,
        { id: pollId, server: { guildId } },
        { populate: ['steps', 'steps.choices', 'server'] },
      );
      return pollRecordToEntity(record);
    },
  };
}

export function createPollLockingFinder(em: EntityManager): PollLockingFinder {
  return {
    async findOrFailLocked({ guildId, pollId }) {
      const record = await em.findOneOrFail(
        Poll,
        { id: pollId, server: { guildId } },
        {
          populate: ['steps', 'steps.choices', 'server'],
          lockMode: LockMode.PESSIMISTIC_WRITE,
        },
      );
      return pollRecordToEntity(record);
    },
  };
}

