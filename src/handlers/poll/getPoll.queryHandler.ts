import type { Finder } from '../../repositories/repository.js';
import type { PollEntity } from '../../entities/poll.entity.js';
import type { PollCriteria } from '../../repositories/poll/poll.finder.js';
import { GetPollQuery } from '../../queries/poll/getPoll.query.js';

export type GetPollRepository = Finder<PollEntity, PollCriteria>;

export class GetPollQueryHandler {
  constructor(private pollRepository: GetPollRepository) {}

  async handle(query: GetPollQuery): Promise<PollEntity> {
    return this.pollRepository.findOrFail({
      guildId: query.guildId,
      pollId: query.pollId,
    });
  }
}
