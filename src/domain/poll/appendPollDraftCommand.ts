import * as z from 'zod';
import type { Finder, Persister } from '../../cqrs/contracts.js';
import type { TransactionRunner } from '../../cqrs/transaction.js';
import { validatePayload } from '../../cqrs/validatePayload.js';
import { newTimestamps } from '../../entities/common.js';
import type { Poll } from '../../entities/poll.js';
import type { PollChoice } from '../../entities/pollChoice.js';
import type { PollStep } from '../../entities/pollStep.js';
import { v4 } from 'uuid';
import type { PollCriteria } from '../../db/model/poll.js';
import { withTransaction } from '../../db/model/session.js';
import {
  assertCanAddChoices,
  assertCanAddStep,
  assertPollIsDraft,
} from './pollDraftAssert.js';

const schema = z.object({
  pollId: z.string().min(1),
  question: z.string().min(1).max(45).nullable(),
  description: z.string().max(100).nullable(),
  choices: z.array(z.string().max(200)),
});

export class AppendPollDraftCommand {
  readonly pollId: string;
  readonly question: string | null;
  readonly description: string | null;
  readonly choices: string[];

  constructor(
    payload: Record<string, unknown>,
    readonly guildId: string,
  ) {
    const data = validatePayload(payload, schema, false);
    this.pollId = data.pollId;
    this.question = data.question;
    this.description = data.description;
    this.choices = data.choices.map((choice) => choice.trim()).filter(Boolean);
  }
}

export class AppendPollDraftCommandHandler {
  constructor(
    private polls: Finder<Poll, PollCriteria> & Persister<Poll>,
    private runInTransaction: TransactionRunner = withTransaction,
  ) {}

  async handle(command: AppendPollDraftCommand): Promise<Poll> {
    const poll = await this.polls.findOrFail({
      id: command.pollId,
      guildId: command.guildId,
    });
    assertPollIsDraft(poll);

    const steps = [...poll.steps].sort((a, b) => a.order - b.order);
    if (command.question) {
      assertCanAddStep(poll);
      const step: PollStep = {
        id: v4(),
        pollId: poll.id,
        question: command.question,
        description: command.description,
        order: steps.length,
        choices: [],
        pollPublicationDate: null,
        ...newTimestamps(),
      };
      steps.push(step);
    }

    if (command.choices.length > 0) {
      const last = steps[steps.length - 1];
      assertCanAddChoices({
        ...last,
        pollPublicationDate: poll.publicationDate,
      });
      const start = last.choices.length;
      const choices: PollChoice[] = command.choices.map((label, index) => ({
        id: v4(),
        pollStepId: last.id,
        label,
        order: start + index,
        ...newTimestamps(),
      }));
      last.choices = [...last.choices, ...choices];
    }

    const next: Poll = { ...poll, steps, updatedAt: new Date() };
    if (command.question || command.choices.length > 0) {
      await this.runInTransaction(async (transaction) => {
        await this.polls.persist(next, transaction);
      });
    }

    return this.polls.findOrFail({
      id: poll.id,
      guildId: command.guildId,
    });
  }
}
