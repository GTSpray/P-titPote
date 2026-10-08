import { v4 } from 'uuid';
import type { PollEntity, PollStepEntity } from '../../entities/poll.entity.js';
import type { CreatePollQuery } from '../../queries/poll/createPoll.query.js';
import type { AppendPollQuestionQuery } from '../../queries/poll/appendPollQuestion.query.js';
import type { AppendPollChoicesQuery } from '../../queries/poll/appendPollChoices.query.js';
import {
  PollAlreadyPublishedError,
  PollChoiceLimitReachedError,
  PollStepLimitReachedError,
} from '../../errors/poll.errors.js';

export const POLL_STEP_LIMIT = 4;
export const STEP_CHOICE_LIMIT = 10;

/** Mirrors EntityBase's "not deleted" sentinel default. */
const NOT_DELETED_AT = new Date('1970-01-01T00:00:00.000Z');

function assertDraft(poll: PollEntity): void {
  if (poll.publicationDate !== null) {
    throw new PollAlreadyPublishedError();
  }
}

export class PollDraftComputer {
  create(
    query: CreatePollQuery,
    context: { serverId: string },
  ): PollEntity {
    const now = new Date();
    const step: PollStepEntity = {
      id: v4(),
      question: query.question,
      description: query.description,
      order: 0,
      choices: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: NOT_DELETED_AT,
    };

    return {
      id: v4(),
      title: query.title,
      role: query.role,
      serverId: context.serverId,
      publicationDate: null,
      endDate: null,
      steps: [step],
      createdAt: now,
      updatedAt: now,
      deletedAt: NOT_DELETED_AT,
    };
  }

  appendQuestion(
    poll: PollEntity,
    query: AppendPollQuestionQuery,
  ): PollEntity {
    assertDraft(poll);
    if (poll.steps.length >= POLL_STEP_LIMIT) {
      throw new PollStepLimitReachedError();
    }

    const now = new Date();
    const step: PollStepEntity = {
      id: v4(),
      question: query.question,
      description: query.description,
      order: poll.steps.length,
      choices: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: NOT_DELETED_AT,
    };

    return {
      ...poll,
      updatedAt: now,
      steps: [...poll.steps, step],
    };
  }

  appendChoices(
    poll: PollEntity,
    query: AppendPollChoicesQuery,
  ): PollEntity {
    assertDraft(poll);

    const lastStep = poll.steps[poll.steps.length - 1];
    if (!lastStep) {
      throw new PollStepLimitReachedError();
    }

    const remaining = STEP_CHOICE_LIMIT - lastStep.choices.length;
    if (remaining <= 0) {
      throw new PollChoiceLimitReachedError();
    }

    const labels = query.choices.slice(0, remaining);
    if (labels.length === 0) {
      return poll;
    }

    const now = new Date();
    const startOrder = lastStep.choices.length;
    const newChoices = labels.map((label, i) => ({
      id: v4(),
      label,
      order: startOrder + i,
      createdAt: now,
      updatedAt: now,
      deletedAt: NOT_DELETED_AT,
    }));

    const updatedStep: PollStepEntity = {
      ...lastStep,
      updatedAt: now,
      choices: [...lastStep.choices, ...newChoices],
    };

    return {
      ...poll,
      updatedAt: now,
      steps: [...poll.steps.slice(0, -1), updatedStep],
    };
  }

  publish(poll: PollEntity): PollEntity {
    assertDraft(poll);
    const now = new Date();
    return {
      ...poll,
      publicationDate: now,
      updatedAt: now,
    };
  }
}
