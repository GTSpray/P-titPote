import type { EntityManager } from '@mikro-orm/core';
import type { Finder, Persister } from '../../repositories/repository.js';
import type { PollEntity } from '../../entities/poll.entity.js';
import type { PollCriteria } from '../../repositories/poll/poll.finder.js';
import { PublishPollQuery } from '../../queries/poll/publishPoll.query.js';
import { PollDraftComputer } from './pollDraft.computer.js';

export type PublishPollRepository = Finder<PollEntity, PollCriteria> &
  Persister<PollEntity>;

export class PublishPollQueryHandler {
  constructor(
    private em: EntityManager,
    private pollRepository: PublishPollRepository,
    private computer: PollDraftComputer,
  ) {}

  async handle(query: PublishPollQuery): Promise<PollEntity> {
    const poll = await this.pollRepository.findOrFail({
      guildId: query.guildId,
      pollId: query.pollId,
    });
    const published = this.computer.publish(poll);
    await this.pollRepository.persist(published);
    await this.em.flush();
    return published;
  }
}
