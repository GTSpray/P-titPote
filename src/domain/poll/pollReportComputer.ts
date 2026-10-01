import type { Computer } from '../../cqrs/contracts.js';
import type { Poll } from '../../entities/poll.js';
import type { PollReport } from '../../entities/pollReport.js';
import type { PollResponse } from '../../entities/pollResponse.js';
import { splitStringIntoChunks } from '../../utils/splitStringIntoChunks.js';
import { unMention } from '../../utils/unMention.js';
import { formatDiscordTimestamp } from '../../utils/pollDates.js';
import { t } from '../../i18n/index.js';

const DISCORD_MESSAGE_LENGTH_LIMIT = 2000;

export function buildPollReport(poll: Poll, responses: PollResponse[]): string {
  const participants = new Set(responses.map((response) => response.memberId));
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

  const stepLines = [...poll.steps]
    .sort((a, b) => a.order - b.order)
    .flatMap((step) => {
      const stepResps = responses.filter(
        (response) => response.pollStepId === step.id,
      );
      const answeredCount = stepResps.filter(
        (response) => response.pollChoiceId || response.content?.trim(),
      ).length;
      const lines = [
        `### ${step.order + 1}. ${step.question}`,
        ...(step.description ? [`-# ${step.description}`] : []),
        t('poll.report.participants', { count: answeredCount }),
      ];

      if (step.choices.length > 0) {
        lines.push(
          ...[...step.choices]
            .sort((a, b) => a.order - b.order)
            .map((choice) => {
              const count = stepResps.filter(
                (response) => response.pollChoiceId === choice.id,
              ).length;
              const percent =
                answeredCount > 0
                  ? Math.round((count / answeredCount) * 100)
                  : 0;
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
        .filter((response) => response.content?.trim())
        .sort((a, b) => {
          const timea = a.createdAt.getTime();
          const timeb = b.createdAt.getTime();
          if (timea === timeb) {
            return 0;
          }
          return timea > timeb ? 1 : -1;
        })
        .map(
          (response, i) =>
            `__${t('poll.report.answerNb', { nb: i + 1 })}:__\n> ${unMention(response.content?.replaceAll('\n', '\n> '))}\n`,
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

export type PollReportContext = {
  poll: Poll;
  responses: PollResponse[];
  channelId: string;
};

export class PollReportComputer implements Computer<
  PollReport,
  PollReportContext
> {
  async compute(
    report: PollReport,
    context: PollReportContext,
  ): Promise<PollReport> {
    const markdown = buildPollReport(context.poll, context.responses);
    return {
      ...report,
      pollId: context.poll.id,
      channelId: context.channelId,
      markdown,
      chunks: splitStringIntoChunks(markdown, DISCORD_MESSAGE_LENGTH_LIMIT),
    };
  }
}
