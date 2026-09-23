import type { Computer } from '../../cqrs/contracts.js';
import { newTimestamps } from '../../entities/common.js';
import type { Poll } from '../../entities/poll.js';
import type { PollResponse } from '../../entities/pollResponse.js';
import { v4 } from 'uuid';

export type PollVoteState = {
  responses: PollResponse[];
};

export type PollVoteAnswer = {
  stepId: string;
  choiceId: string | null;
  content: string | null;
};

export type PollVoteContext = {
  poll: Poll;
  memberId: string;
  answers: PollVoteAnswer[];
};

export class PollVoteComputer implements Computer<
  PollVoteState,
  PollVoteContext
> {
  async compute(
    state: PollVoteState,
    context: PollVoteContext,
  ): Promise<PollVoteState> {
    const responses = [...context.poll.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => {
        const existing = state.responses.find(
          (response) => response.pollStepId === step.id,
        );
        const answer = context.answers.find((item) => item.stepId === step.id);
        const base: PollResponse = existing ?? {
          id: v4(),
          memberId: context.memberId,
          pollStepId: step.id,
          pollChoiceId: null,
          content: null,
          ...newTimestamps(),
        };
        if (step.choices.length > 0) {
          const choice = step.choices.find(
            (item) => item.id === answer?.choiceId,
          );
          return {
            ...base,
            pollChoiceId: choice?.id ?? null,
            updatedAt: new Date(),
          };
        }
        return {
          ...base,
          content: answer?.content ?? null,
          updatedAt: new Date(),
        };
      });
    return { responses };
  }
}
