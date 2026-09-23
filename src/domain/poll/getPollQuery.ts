import type { Finder, TryFinder } from '../../cqrs/contracts.js';
import type { Poll } from '../../entities/poll.js';
import type { PollCriteria } from '../../db/model/poll.js';

export class GetPollQuery {
  constructor(
    readonly pollId: string,
    readonly guildId: string,
  ) {}
}

export class GetPollQueryHandler {
  constructor(private polls: TryFinder<Poll, PollCriteria>) {}

  handle(query: GetPollQuery): Promise<Poll | null> {
    return this.polls.find({ id: query.pollId, guildId: query.guildId });
  }
}

export class GetPollOrFailQueryHandler {
  constructor(private polls: Finder<Poll, PollCriteria>) {}

  handle(query: GetPollQuery): Promise<Poll> {
    return this.polls.findOrFail({
      id: query.pollId,
      guildId: query.guildId,
    });
  }
}
