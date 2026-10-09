import * as z from 'zod';
import type {
  BulkPersister,
  Computer,
  Lister,
  LockingFinder,
} from '../../cqrs/contracts.js';
import type { TransactionRunner } from '../../cqrs/transaction.js';
import { validatePayload } from '../../cqrs/validatePayload.js';
import type { Poll } from '../../entities/poll.js';
import type { PollResponse } from '../../entities/pollResponse.js';
import type { PollCriteria } from '../../db/model/poll.js';
import type { PollResponseCriteria } from '../../db/model/pollResponse.js';
import { withTransaction } from '../../db/model/session.js';
import { assertCanRecordVote } from './pollVoteAssert.js';
import {
  PollVoteComputer,
  type PollVoteContext,
  type PollVoteState,
} from './pollVoteComputer.js';

const schema = z.object({
  pollId: z.string().min(1),
  memberId: z.string().min(1),
  roles: z.array(z.string()),
  answers: z.array(
    z.object({
      stepId: z.string().min(1),
      choiceId: z.string().nullable(),
      content: z.string().nullable(),
    }),
  ),
});

export class RecordPollVoteCommand {
  readonly pollId: string;
  readonly memberId: string;
  readonly roles: string[];
  readonly answers: PollVoteContext['answers'];

  constructor(
    payload: Record<string, unknown>,
    readonly guildId: string,
  ) {
    const data = validatePayload(payload, schema, false);
    this.pollId = data.pollId;
    this.memberId = data.memberId;
    this.roles = data.roles;
    this.answers = data.answers;
  }
}

export class RecordPollVoteCommandHandler {
  constructor(
    private polls: LockingFinder<Poll, PollCriteria>,
    private responses: Lister<PollResponseCriteria, PollResponse> &
      BulkPersister<PollResponse>,
    private computer: Computer<
      PollVoteState,
      PollVoteContext
    > = new PollVoteComputer(),
    private runInTransaction: TransactionRunner = withTransaction,
  ) {}

  async handle(command: RecordPollVoteCommand): Promise<void> {
    await this.runInTransaction(async (transaction) => {
      const poll = await this.polls.findOrFailForUpdate(
        { id: command.pollId, guildId: command.guildId },
        transaction,
      );
      assertCanRecordVote(poll, command.roles);
      const existing = await this.responses.list(
        { pollId: poll.id, memberId: command.memberId },
        undefined,
        transaction,
      );
      const computed = await this.computer.compute(
        { responses: existing.items },
        {
          poll,
          memberId: command.memberId,
          answers: command.answers,
        },
      );
      await this.responses.bulkPersist(computed.responses, transaction);
    });
  }
}
