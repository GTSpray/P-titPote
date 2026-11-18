import type { EntityManager } from '@mikro-orm/core';
import { LockMode } from '@mikro-orm/core';
import { Poll } from '../../db/entities/Poll.entity.js';
import { PollResp } from '../../db/entities/PollResp.entity.js';
import {
  pollRecordToEntity,
  pollRespRecordToEntity,
} from '../../repositories/poll/poll.mapper.js';
import { SubmitPollVoteQuery } from '../../queries/poll/submitPollVote.query.js';
import { PollVoteComputer } from './pollVote.computer.js';
import type { PollEntity } from '../../entities/poll.entity.js';

export class SubmitPollVoteQueryHandler {
  constructor(
    private em: EntityManager,
    private computer: PollVoteComputer,
  ) {}

  async handle(query: SubmitPollVoteQuery): Promise<PollEntity> {
    return this.em.transactional(async (tx) => {
      const aPoll = await tx.findOneOrFail(
        Poll,
        { id: query.pollId, server: { guildId: query.guildId } },
        {
          populate: ['steps', 'steps.choices'],
          lockMode: LockMode.PESSIMISTIC_WRITE,
        },
      );

      const pollEntity = pollRecordToEntity(aPoll);

      const pollResps = await tx.findAll(PollResp, {
        where: {
          memberId: query.memberId,
          pollStep: { poll: aPoll },
        },
      });

      const existing = pollResps.map(pollRespRecordToEntity);
      const updated = this.computer.upsertResponses(
        pollEntity,
        query,
        existing,
      );

      const records = updated.map((entity) => {
        const step = aPoll.steps
          .getItems()
          .find((item) => item.id === entity.pollStepId)!;

        let record = pollResps.find((item) => item.id === entity.id) ?? null;
        if (!record) {
          record = new PollResp(entity.memberId, step);
          record.id = entity.id;
          record.createdAt = entity.createdAt;
          record.deletedAt = entity.deletedAt;
        }
        record.pollChoice = entity.pollChoiceId
          ? (step.choices
              .getItems()
              .find((item) => item.id === entity.pollChoiceId) ?? null)
          : null;
        record.content = entity.content;
        record.updatedAt = entity.updatedAt;
        return record;
      });

      await tx.persist(records).flush();
      return pollEntity;
    });
  }
}
