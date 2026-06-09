import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { Poll } from '../../../db/entities/Poll.entity.js';
import { PollResp } from '../../../db/entities/PollResp.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  formatDiscordTimestamp,
  isPollClosed,
} from '../../../utils/pollDates.js';

const MAX_REPORT_LENGTH = 3900;

const truncateReport = (report: string): string =>
  report.length > MAX_REPORT_LENGTH
    ? `${report.slice(0, MAX_REPORT_LENGTH - 3)}...`
    : report;

const buildPollSummary = (aPoll: Poll, pollResps: PollResp[]): string => {
  const participants = new Set(pollResps.map((pollResp) => pollResp.memberId));
  const summaryLines = [
    t('poll.report.title'),
    `## ${aPoll.title}`,
    t('poll.report.participants', { count: participants.size }),
    ...(aPoll.endDate
      ? [
          t('poll.report.endDate', {
            date: formatDiscordTimestamp(aPoll.endDate),
          }),
        ]
      : []),
    '',
  ];

  const stepLines = aPoll.steps.getItems().flatMap((step) => {
    const stepResps = pollResps.filter(
      (pollResp) => pollResp.pollStep.id === step.id,
    );
    const answeredCount = stepResps.filter(
      (pollResp) => pollResp.pollChoice || pollResp.content?.trim(),
    ).length;
    const lines = [
      `### ${step.order + 1}. ${step.question}`,
      ...(step.description ? [`-# ${step.description}`] : []),
      `Réponses : ${answeredCount}`,
    ];

    if (step.choices.count() > 0) {
      lines.push(
        ...step.choices.getItems().map((choice) => {
          const count = stepResps.filter(
            (pollResp) => pollResp.pollChoice?.id === choice.id,
          ).length;
          const percent =
            answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
          return `- ${choice.label} : ${count} vote(s) (${percent}%)`;
        }),
      );
      return [...lines, ''];
    }

    const textResponses = stepResps
      .filter((pollResp) => pollResp.content?.trim())
      .map((pollResp) => `- <@${pollResp.memberId}> : ${pollResp.content}`);

    lines.push(
      ...(textResponses.length ? textResponses : [t('poll.report.noResponse')]),
    );
    return [...lines, ''];
  });

  return truncateReport([...summaryLines, ...stepLines].join('\n'));
};

export const pollSummary: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const pollId = (<any>additionalData).d.pId;
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const aPoll = await em.findOne(
        Poll,
        { server: { guildId }, id: pollId },
        {
          populate: ['steps', 'steps.choices'],
        },
      );

      if (!aPoll) {
        return res.status(500).json({ error: t('errors.noPoll') });
      }

      if (aPoll.endDate && !isPollClosed(aPoll.endDate)) {
        return res.json(errorPayload(t('errors.voteNotClosed')));
      }

      const pollResps = await em.findAll(PollResp, {
        where: { pollStep: { poll: aPoll } },
        populate: ['pollStep', 'pollChoice'],
        orderBy: {
          pollStep: {
            order: 'asc',
          },
        },
      });

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.IsComponentsV2,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: buildPollSummary(aPoll, pollResps),
            },
          ],
        },
      });
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
