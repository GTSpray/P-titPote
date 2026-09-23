import type {
  Computer,
  Lister,
  LockingFinder,
  Notifier,
  Persister,
} from '../../cqrs/contracts.js';
import type { TransactionRunner } from '../../cqrs/transaction.js';
import type { Poll } from '../../entities/poll.js';
import type { PollReport } from '../../entities/pollReport.js';
import type { PollResponse } from '../../entities/pollResponse.js';
import { logger } from '../../logger.js';
import { isPollClosed } from '../../utils/pollDates.js';
import type { PollCriteria } from '../../db/model/poll.js';
import type { PollResponseCriteria } from '../../db/model/pollResponse.js';
import { withTransaction } from '../../db/model/session.js';
import { DiscordPollReportNotifier } from './discordPollReportNotifier.js';
import {
  PollReportComputer,
  type PollReportContext,
} from './pollReportComputer.js';

export class PublishPollReportCommand {
  constructor(
    readonly pollId: string,
    readonly guildId: string,
    readonly channelId: string,
  ) {}
}

export type PublishPollReportResult =
  { sent: true; count: number } | { sent: false };

export class PublishPollReportCommandHandler {
  constructor(
    private polls: LockingFinder<Poll, PollCriteria> & Persister<Poll>,
    private responses: Lister<PollResponseCriteria, PollResponse>,
    private reports: Computer<
      PollReport,
      PollReportContext
    > = new PollReportComputer(),
    private notifier: Notifier<PollReport> = new DiscordPollReportNotifier(),
    private runInTransaction: TransactionRunner = withTransaction,
  ) {}

  async handle(
    command: PublishPollReportCommand,
  ): Promise<PublishPollReportResult> {
    return this.runInTransaction(async (transaction) => {
      const poll = await this.polls.findOrFailForUpdate(
        { id: command.pollId, guildId: command.guildId },
        transaction,
      );
      const previousEndDate = poll.endDate;
      const shouldClose = !isPollClosed(previousEndDate);
      let current = poll;
      if (shouldClose) {
        current = { ...poll, endDate: new Date(), updatedAt: new Date() };
        await this.polls.persist(current, transaction);
      }

      const listed = await this.responses.list(
        { pollId: poll.id },
        undefined,
        transaction,
      );
      const report = await this.reports.compute(
        {
          pollId: poll.id,
          channelId: command.channelId,
          markdown: '',
          chunks: [],
        },
        {
          poll: current,
          responses: listed.items,
          channelId: command.channelId,
        },
      );

      try {
        await this.notifier.notify(report);
      } catch (error) {
        logger.error(error);
        if (shouldClose) {
          await this.polls.persist(
            { ...current, endDate: previousEndDate },
            transaction,
          );
        }
        return { sent: false };
      }

      await this.polls.persist(current, transaction);
      return { sent: true, count: report.chunks.length };
    });
  }
}
