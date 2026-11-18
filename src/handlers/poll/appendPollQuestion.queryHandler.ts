import type { EntityManager } from '@mikro-orm/core';
import type { Finder, Persister } from '../../repositories/repository.js';
import type { PollEntity } from '../../entities/poll.entity.js';
import type { PollCriteria } from '../../repositories/poll/poll.finder.js';
import { AppendPollQuestionQuery } from '../../queries/poll/appendPollQuestion.query.js';
import { PollDraftComputer } from './pollDraft.computer.js';

export type AppendPollQuestionRepository = Finder<PollEntity, PollCriteria> &
  Persister<PollEntity>;

export class AppendPollQuestionQueryHandler {
  constructor(
    private em: EntityManager,
    private pollRepository: AppendPollQuestionRepository,
    private computer: PollDraftComputer,
  ) {}

  async handle(query: AppendPollQuestionQuery): Promise<PollEntity> {
    const poll = await this.pollRepository.findOrFail({
      guildId: query.guildId,
      pollId: query.pollId,
    });
    const updated = this.computer.appendQuestion(poll, query);
    await this.pollRepository.persist(updated);
    await this.em.flush();
    return updated;
  }
}
