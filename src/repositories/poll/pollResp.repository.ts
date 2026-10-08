import type { EntityManager } from '@mikro-orm/core';
import { PollResp } from '../../db/entities/PollResp.entity.js';
import { PollStep } from '../../db/entities/PollStep.entity.js';
import { PollChoice } from '../../db/entities/PollChoice.entity.js';
import type { Lister, Persister } from '../repository.js';
import type { PollRespEntity } from '../../entities/poll.entity.js';
import { pollRespRecordToEntity } from './poll.mapper.js';

export type PollRespListCriteria = {
  guildId: string;
  pollId: string;
  memberId?: string;
};

export function createPollRespLister(
  em: EntityManager,
): Lister<PollRespEntity, PollRespListCriteria> {
  return {
    async list({ guildId, pollId, memberId }) {
      const records = await em.findAll(PollResp, {
        where: {
          ...(memberId ? { memberId } : {}),
          pollStep: { poll: { id: pollId, server: { guildId } } },
        },
        populate: ['pollStep', 'pollChoice'],
        orderBy: {
          pollStep: { order: 'asc' },
        },
      });
      return records.map(pollRespRecordToEntity);
    },
  };
}

export function createPollRespPersister(
  em: EntityManager,
): Persister<PollRespEntity> {
  return {
    async persist(entity) {
      let record = await em.findOne(PollResp, { id: entity.id });
      if (!record) {
        record = new PollResp(
          entity.memberId,
          em.getReference(PollStep, entity.pollStepId),
        );
        record.id = entity.id;
        record.createdAt = entity.createdAt;
        record.deletedAt = entity.deletedAt;
      }
      record.memberId = entity.memberId;
      record.pollStep = em.getReference(PollStep, entity.pollStepId);
      record.pollChoice = entity.pollChoiceId
        ? em.getReference(PollChoice, entity.pollChoiceId)
        : null;
      record.content = entity.content;
      record.updatedAt = entity.updatedAt;
      record.deletedAt = entity.deletedAt;
      em.persist(record);
    },
  };
}

export type PollRespBulkPersister = {
  bulkPersist(entities: PollRespEntity[]): Promise<void>;
};

export function createPollRespBulkPersister(
  em: EntityManager,
): PollRespBulkPersister {
  const persister = createPollRespPersister(em);
  return {
    async bulkPersist(entities) {
      for (const entity of entities) {
        await persister.persist(entity);
      }
    },
  };
}
