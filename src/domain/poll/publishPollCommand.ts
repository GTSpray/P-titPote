import type { Computer, Finder, Persister } from '../../cqrs/contracts.js';
import type { TransactionRunner } from '../../cqrs/transaction.js';
import type { Poll } from '../../entities/poll.js';
import type { PollCriteria } from '../../db/model/poll.js';
import { withTransaction } from '../../db/model/session.js';
import { assertPollIsDraft } from './pollDraftAssert.js';

export class PublishPollCommand {
  constructor(
    readonly pollId: string,
    readonly guildId: string,
  ) {}
}

export class PublishPollComputer implements Computer<Poll, null> {
  async compute(poll: Poll): Promise<Poll> {
    return {
      ...poll,
      publicationDate: new Date(),
      updatedAt: new Date(),
    };
  }
}

export class PublishPollCommandHandler {
  constructor(
    private polls: Finder<Poll, PollCriteria> & Persister<Poll>,
    private computer: Computer<Poll, null> = new PublishPollComputer(),
    private runInTransaction: TransactionRunner = withTransaction,
  ) {}

  async handle(command: PublishPollCommand): Promise<Poll> {
    const poll = await this.polls.findOrFail({
      id: command.pollId,
      guildId: command.guildId,
    });
    assertPollIsDraft(poll);
    const published = await this.computer.compute(poll, null);
    await this.runInTransaction(async (transaction) => {
      await this.polls.persist(published, transaction);
    });
    return this.polls.findOrFail({
      id: command.pollId,
      guildId: command.guildId,
    });
  }
}
