import type { Finder } from '../../repositories/repository.js';
import type {
  PollStepCriteria,
  PollStepWithPoll,
} from '../../repositories/poll/pollStep.finder.js';
import { GetPollStepQuery } from '../../queries/poll/getPollStep.query.js';

export class GetPollStepQueryHandler {
  constructor(
    private pollStepRepository: Finder<PollStepWithPoll, PollStepCriteria>,
  ) {}

  async handle(query: GetPollStepQuery): Promise<PollStepWithPoll> {
    return this.pollStepRepository.findOrFail({
      guildId: query.guildId,
      stepId: query.stepId,
    });
  }
}
