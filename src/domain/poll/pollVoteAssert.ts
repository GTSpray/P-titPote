import { ForbiddenError, VoteClosedError } from '../../cqrs/errors.js';
import type { Poll } from '../../entities/poll.js';
import { isPollClosed } from '../../utils/pollDates.js';

export function assertPollAcceptsVotes(poll: Poll, roles: string[]): void {
  if (isPollClosed(poll.endDate)) {
    throw new VoteClosedError();
  }
  if (poll.role && !roles.includes(poll.role)) {
    throw new ForbiddenError('not allowed');
  }
}

export function assertCanRecordVote(
  poll: Poll,
  roles: string[],
  now = new Date(),
): void {
  if (poll.endDate && poll.endDate.getTime() < now.getTime()) {
    throw new VoteClosedError();
  }
  if (poll.role && !roles.includes(poll.role)) {
    throw new ForbiddenError('not allowed');
  }
  if (isPollClosed(poll.endDate, now)) {
    throw new VoteClosedError();
  }
}
