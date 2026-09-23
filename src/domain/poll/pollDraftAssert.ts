import { PollAlreadyPublishedError, TooManyError } from '../../cqrs/errors.js';
import type { Poll } from '../../entities/poll.js';
import type { PollStep } from '../../entities/pollStep.js';

export const POLL_STEP_LIMIT = 4;
export const STEP_CHOICE_LIMIT = 10;

export function assertPollIsDraft(poll: {
  publicationDate: Date | null;
}): void {
  if (poll.publicationDate !== null) {
    throw new PollAlreadyPublishedError();
  }
}

export function assertCanAddStep(poll: Poll): void {
  assertPollIsDraft(poll);
  if (poll.steps.length >= POLL_STEP_LIMIT) {
    throw new TooManyError();
  }
}

export function assertCanAddChoices(step: PollStep): void {
  if (step.pollPublicationDate !== null) {
    throw new PollAlreadyPublishedError();
  }
  if (step.choices.length >= STEP_CHOICE_LIMIT) {
    throw new TooManyError();
  }
}
