import { v4 } from 'uuid';
import type { PollEntity, PollRespEntity } from '../../entities/poll.entity.js';
import type { SubmitPollVoteQuery } from '../../queries/poll/submitPollVote.query.js';
import {
  MissingVoterRoleError,
  PollClosedError,
} from '../../errors/poll.errors.js';
import { isPollClosed } from '../../utils/pollDates.js';
import {
  ComponentSelect,
  ComponentSimple,
  getInputComponnentById,
} from '../../commands/modals.js';

/** Mirrors EntityBase's "not deleted" sentinel default. */
const NOT_DELETED_AT = new Date('1970-01-01T00:00:00.000Z');

export type PollVoteAnswer = {
  stepId: string;
  choiceId: string | null;
  content: string | null;
};

export class PollVoteComputer {
  assertCanVote(
    poll: PollEntity,
    memberRoles: string[],
    now = new Date(),
  ): void {
    if (isPollClosed(poll.endDate, now)) {
      throw new PollClosedError();
    }
    if (poll.role && !memberRoles.includes(poll.role)) {
      throw new MissingVoterRoleError();
    }
  }

  answersFromModal(poll: PollEntity, modalData: unknown): PollVoteAnswer[] {
    return poll.steps.map((step) => {
      if (step.choices.length > 0) {
        const qRespChoice = getInputComponnentById<ComponentSelect>(
          modalData as never,
          step.id,
        );
        return {
          stepId: step.id,
          choiceId: qRespChoice?.component.values[0] ?? null,
          content: null,
        };
      }
      const qRespValue = getInputComponnentById<ComponentSimple>(
        modalData as never,
        step.id,
      );
      return {
        stepId: step.id,
        choiceId: null,
        content: qRespValue?.component.value ?? null,
      };
    });
  }

  upsertResponses(
    poll: PollEntity,
    query: SubmitPollVoteQuery,
    existing: PollRespEntity[],
  ): PollRespEntity[] {
    this.assertCanVote(poll, query.memberRoles);

    const answers = this.answersFromModal(poll, query.modalData);
    const answersByStep = new Map(
      answers.map((answer) => [answer.stepId, answer]),
    );

    const now = new Date();
    return poll.steps.map((step) => {
      const answer = answersByStep.get(step.id);
      const previous =
        existing.find((resp) => resp.pollStepId === step.id) ?? null;

      const base: PollRespEntity = previous ?? {
        id: v4(),
        memberId: query.memberId,
        pollStepId: step.id,
        pollChoiceId: null,
        content: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: NOT_DELETED_AT,
      };

      if (step.choices.length > 0) {
        return {
          ...base,
          pollChoiceId: answer?.choiceId ?? null,
          content: null,
          updatedAt: now,
        };
      }

      return {
        ...base,
        pollChoiceId: null,
        content: answer?.content ?? null,
        updatedAt: now,
      };
    });
  }
}
