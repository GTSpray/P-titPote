import type { EntityManager } from '@mikro-orm/core';
import { LockMode } from '@mikro-orm/core';
import { Poll } from '../../db/entities/Poll.entity.js';
import { PollResp } from '../../db/entities/PollResp.entity.js';
import {
  pollRecordToEntity,
  pollRespRecordToEntity,
} from '../../repositories/poll/poll.mapper.js';
import { ClosePollReportQuery } from '../../queries/poll/closePollReport.query.js';
import {
  PollReportComputer,
  type PollReportPublisher,
} from './pollReport.computer.js';
import { PollReportPublishError } from '../../errors/poll.errors.js';
import { splitStringIntoChunks } from '../../utils/splitStringIntoChunks.js';

const DISCORD_MESSAGE_LENGTH_LIMIT = 2000;

export type ClosePollReportResult = {
  chunkCount: number;
};

export class ClosePollReportQueryHandler {
  constructor(
    private em: EntityManager,
    private computer: PollReportComputer,
    private publisher: PollReportPublisher,
  ) {}

  async handle(query: ClosePollReportQuery): Promise<ClosePollReportResult> {
    return this.em.transactional(async (tx) => {
      const aPoll = await tx.findOneOrFail(
        Poll,
        { server: { guildId: query.guildId }, id: query.pollId },
        {
          populate: ['steps', 'steps.choices'],
          lockMode: LockMode.PESSIMISTIC_WRITE,
        },
      );

      const pollEntity = pollRecordToEntity(aPoll);
      const { poll: closedEntity, previousEndDate, didClose } =
        this.computer.closeIfOpen(pollEntity);

      if (didClose) {
        aPoll.endDate = closedEntity.endDate ?? undefined;
        await tx.persist(aPoll).flush();
      }

      const pollResps = await tx.findAll(PollResp, {
        where: { pollStep: { poll: aPoll } },
        populate: ['pollStep', 'pollChoice'],
        orderBy: {
          pollStep: {
            order: 'asc',
          },
        },
      });

      const report = this.computer.buildReport(
        { ...closedEntity, endDate: aPoll.endDate ?? null },
        pollResps.map(pollRespRecordToEntity),
      );
      const chunks = splitStringIntoChunks(
        report,
        DISCORD_MESSAGE_LENGTH_LIMIT,
      );

      try {
        await this.publisher.publish(chunks);
      } catch {
        if (didClose) {
          aPoll.endDate = previousEndDate ?? undefined;
          await tx.persist(aPoll).flush();
        }
        throw new PollReportPublishError();
      }

      await tx.persist(aPoll).flush();

      return { chunkCount: chunks.length };
    });
  }
}
