import type { EntityManager } from '@mikro-orm/core';
import type { Finder, Persister } from '../../repositories/repository.js';
import type { PollEntity } from '../../entities/poll.entity.js';
import type { PollCriteria } from '../../repositories/poll/poll.finder.js';
import { AppendPollChoicesQuery } from '../../queries/poll/appendPollChoices.query.js';
import { PollDraftComputer } from './pollDraft.computer.js';

export type AppendPollChoicesRepository = Finder<PollEntity, PollCriteria> &
  Persister<PollEntity>;

export class AppendPollChoicesQueryHandler {
  constructor(
    private em: EntityManager,
    private pollRepository: AppendPollChoicesRepository,
    private computer: PollDraftComputer,
  ) {}

  async handle(query: AppendPollChoicesQuery): Promise<PollEntity> {
    const poll = await this.pollRepository.findOrFail({
      guildId: query.guildId,
      pollId: query.pollId,
    });
    const updated = this.computer.appendChoices(poll, query);
    await this.pollRepository.persist(updated);
    await this.em.flush();
    return updated;
  }
}
