import * as z from 'zod';
import type { Finder, Persister, TryFinder } from '../../cqrs/contracts.js';
import type { TransactionRunner } from '../../cqrs/transaction.js';
import { validatePayload } from '../../cqrs/validatePayload.js';
import { newTimestamps } from '../../entities/common.js';
import type { DiscordGuild } from '../../entities/discordGuild.js';
import type { Poll } from '../../entities/poll.js';
import type { PollStep } from '../../entities/pollStep.js';
import { v4 } from 'uuid';
import type { DiscordGuildCriteria } from '../../db/model/discordGuild.js';
import type { PollCriteria } from '../../db/model/poll.js';
import { withTransaction } from '../../db/model/session.js';

const schema = z.object({
  title: z.string().min(1).max(45),
  role: z.string().max(50).nullable(),
  question: z.string().min(1).max(45),
  description: z.string().max(100).nullable(),
});

export class CreatePollCommand {
  readonly title: string;
  readonly role: string | null;
  readonly question: string;
  readonly description: string | null;

  constructor(
    payload: Record<string, unknown>,
    readonly guildId: string,
  ) {
    const data = validatePayload(payload, schema, false);
    this.title = data.title;
    this.role = data.role || null;
    this.question = data.question;
    this.description = data.description;
  }
}

export class CreatePollCommandHandler {
  constructor(
    private guilds: TryFinder<DiscordGuild, DiscordGuildCriteria> &
      Persister<DiscordGuild>,
    private polls: Persister<Poll> & Finder<Poll, PollCriteria>,
    private runInTransaction: TransactionRunner = withTransaction,
  ) {}

  async handle(command: CreatePollCommand): Promise<Poll> {
    const now = newTimestamps();
    const pollId = v4();
    const step: PollStep = {
      id: v4(),
      pollId,
      question: command.question,
      description: command.description,
      order: 0,
      choices: [],
      pollPublicationDate: null,
      ...now,
    };
    const poll: Poll = {
      id: pollId,
      guildId: command.guildId,
      title: command.title,
      role: command.role,
      endDate: null,
      publicationDate: null,
      steps: [step],
      ...now,
    };

    await this.runInTransaction(async (transaction) => {
      const guild = await this.guilds.find(
        { guildId: command.guildId },
        transaction,
      );
      if (!guild) {
        await this.guilds.persist(
          {
            id: v4(),
            guildId: command.guildId,
            ...newTimestamps(),
          },
          transaction,
        );
      }
      await this.polls.persist(poll, transaction);
    });

    return this.polls.findOrFail({
      id: poll.id,
      guildId: command.guildId,
    });
  }
}
