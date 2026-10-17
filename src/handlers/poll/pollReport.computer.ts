import type { PollEntity, PollRespEntity } from '../../entities/poll.entity.js';
import { t } from '../../i18n/index.js';
import {
  formatDiscordTimestamp,
  isPollClosed,
} from '../../utils/pollDates.js';
import { unMention } from '../../utils/unMention.js';

export class PollReportComputer {
  closeIfOpen(poll: PollEntity, now = new Date()): {
    poll: PollEntity;
    previousEndDate: Date | null;
    didClose: boolean;
  } {
    const previousEndDate = poll.endDate;
    if (isPollClosed(previousEndDate, now)) {
      return { poll, previousEndDate, didClose: false };
    }
    return {
      poll: { ...poll, endDate: now, updatedAt: now },
      previousEndDate,
      didClose: true,
    };
  }

  restoreEndDate(
    poll: PollEntity,
    previousEndDate: Date | null,
  ): PollEntity {
    return {
      ...poll,
      endDate: previousEndDate,
      updatedAt: new Date(),
    };
  }

  buildReport(poll: PollEntity, pollResps: PollRespEntity[]): string {
    const participants = new Set(pollResps.map((pollResp) => pollResp.memberId));
    const summaryLines = [
      `# ${t('poll.report.title')}`,
      `## ${poll.title}`,
      t('poll.report.participants', { count: participants.size }),
      ...(poll.endDate
        ? [
            t('poll.report.endDate', {
              date: formatDiscordTimestamp(poll.endDate),
            }),
          ]
        : []),
      '',
    ];

    const stepLines = poll.steps.flatMap((step) => {
      const stepResps = pollResps.filter(
        (pollResp) => pollResp.pollStepId === step.id,
      );
      const answeredCount = stepResps.filter(
        (pollResp) => pollResp.pollChoiceId || pollResp.content?.trim(),
      ).length;
      const lines = [
        `### ${step.order + 1}. ${step.question}`,
        ...(step.description ? [`-# ${step.description}`] : []),
        t('poll.report.participants', { count: answeredCount }),
      ];

      if (step.choices.length > 0) {
        lines.push(
          ...step.choices.map((choice) => {
            const count = stepResps.filter(
              (pollResp) => pollResp.pollChoiceId === choice.id,
            ).length;
            const percent =
              answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;

            return `- ${t('poll.report.votePercent', {
              label: choice.label,
              count,
              percent,
            })}`;
          }),
        );
        return [...lines, ''];
      }

      const textResponses = stepResps
        .filter((pollResp) => pollResp.content?.trim())
        .sort((a, b) => {
          const timea = a.createdAt.getTime();
          const timeb = b.createdAt.getTime();
          if (timea === timeb) {
            return 0;
          }
          return timea > timeb ? 1 : -1;
        })
        .map(
          (pollResp, i) =>
            `__${t('poll.report.answerNb', { nb: i + 1 })}:__\n> ${unMention(pollResp.content?.replaceAll('\n', '\n> '))}\n`,
        );

      lines.push(
        ...(textResponses.length
          ? textResponses
          : [t('poll.report.noResponse')]),
      );
      return [...lines, ''];
    });

    return [...summaryLines, ...stepLines].join('\n');
  }
}

export type PollReportPublisher = {
  publish(chunks: string[]): Promise<void>;
};
