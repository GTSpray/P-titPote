import type { Finder } from '../../cqrs/contracts.js';
import type { PollStep } from '../../entities/pollStep.js';
import type { PollStepCriteria } from '../../db/model/pollStep.js';
import { assertCanAddChoices } from './pollDraftAssert.js';

export class GetPollStepQuery {
  constructor(
    readonly stepId: string,
    readonly guildId: string,
  ) {}
}

export class GetPollStepQueryHandler {
  constructor(private steps: Finder<PollStep, PollStepCriteria>) {}

  async handle(query: GetPollStepQuery): Promise<PollStep> {
    const step = await this.steps.findOrFail({
      id: query.stepId,
      guildId: query.guildId,
    });
    assertCanAddChoices(step);
    return step;
  }
}
