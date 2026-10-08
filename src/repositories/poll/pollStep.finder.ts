import type { EntityManager } from '@mikro-orm/core';
import { PollStep } from '../../db/entities/PollStep.entity.js';
import type { Finder } from '../repository.js';
import type { PollStepEntity } from '../../entities/poll.entity.js';
import { pollStepRecordToEntity } from './poll.mapper.js';

export type PollStepCriteria = { guildId: string; stepId: string };

export type PollStepWithPoll = PollStepEntity & {
  pollId: string;
  publicationDate: Date | null;
};

export function createPollStepFinder(
  em: EntityManager,
): Finder<PollStepWithPoll, PollStepCriteria> {
  return {
    async findOrFail({ guildId, stepId }) {
      const record = await em.findOneOrFail(
        PollStep,
        { id: stepId, poll: { server: { guildId } } },
        { populate: ['poll', 'choices'] },
      );
      return {
        ...pollStepRecordToEntity(record),
        pollId: record.poll.id,
        publicationDate: record.poll.publicationDate ?? null,
      };
    },
  };
}
