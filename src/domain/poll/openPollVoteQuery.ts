import type {
  Lister,
  PaginatedLister,
  TryFinder,
} from '../../cqrs/contracts.js';
import type { Poll } from '../../entities/poll.js';
import type { PollResponse } from '../../entities/pollResponse.js';
import type { PollStep } from '../../entities/pollStep.js';
import type { PollCriteria } from '../../db/model/poll.js';
import type { PollResponseCriteria } from '../../db/model/pollResponse.js';
import type { PollStepPageCriteria } from '../../db/model/pollStep.js';
import { assertPollAcceptsVotes } from './pollVoteAssert.js';

export class OpenPollVoteQuery {
  constructor(
    readonly pollId: string,
    readonly guildId: string,
    readonly memberId: string,
    readonly roles: string[],
    readonly after: string | number = 0,
  ) {}
}

export type OpenPollVoteResult = {
  poll: Poll;
  steps: PollStep[];
  responses: PollResponse[];
};

export class OpenPollVoteQueryHandler {
  constructor(
    private polls: TryFinder<Poll, PollCriteria>,
    private steps: PaginatedLister<PollStepPageCriteria, PollStep>,
    private responses: Lister<PollResponseCriteria, PollResponse>,
  ) {}

  async handle(query: OpenPollVoteQuery): Promise<OpenPollVoteResult | null> {
    const poll = await this.polls.find({
      id: query.pollId,
      guildId: query.guildId,
    });
    if (!poll) {
      return null;
    }
    assertPollAcceptsVotes(poll, query.roles);
    const page = await this.steps.list(
      { pollId: poll.id },
      { limit: 5, after: query.after },
    );
    const existing = await this.responses.list({
      pollId: poll.id,
      memberId: query.memberId,
    });
    return { poll, steps: page.items, responses: existing.items };
  }
}
