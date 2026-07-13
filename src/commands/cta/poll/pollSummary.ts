import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
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
import { unMention } from '../../../utils/unMention.js';
import { splitStringIntoChunks } from '../../../utils/splitStringIntoChunks.js';
import { Routes } from 'discord-api-types/v10';
import { discordapi } from '../../../utils/discordapi.js';

const DISCORD_MESSAGE_LENGTH_LIMIT = 2000;

const buildPollSummary = (aPoll: Poll, pollResps: PollResp[]): string => {
  const participants = new Set(pollResps.map((pollResp) => pollResp.memberId));
  const summaryLines = [
    `# ${t('poll.report.title')}`,
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
      t('poll.report.participants', { count: answeredCount }),
    ];

    if (step.choices.count() > 0) {
      lines.push(
        ...step.choices.getItems().map((choice) => {
          const count = stepResps.filter(
            (pollResp) => pollResp.pollChoice?.id === choice.id,
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
        } else {
          return timea > timeb ? 1 : -1;
        }
      })
      .map(
        (pollResp, i) =>
          `__${t('poll.report.answerNb', { nb: i + 1 })}:__\n> ${unMention(pollResp.content?.replaceAll('\n', '\n> '))}\n`,
      );

    lines.push(
      ...(textResponses.length ? textResponses : [t('poll.report.noResponse')]),
    );
    return [...lines, ''];
  });

  return [...summaryLines, ...stepLines].join('\n');
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
    const channelId = req.body.channel?.id;
    if (dbServices && guildId && channelId) {
      const em = dbServices.orm.em.fork();
      const aPoll = await em.findOneOrFail(
        Poll,
        { server: { guildId }, id: pollId },
        {
          populate: ['steps', 'steps.choices'],
        },
      );

      const pollResps = await em.findAll(PollResp, {
        where: { pollStep: { poll: aPoll } },
        populate: ['pollStep', 'pollChoice'],
        orderBy: {
          pollStep: {
            order: 'asc',
          },
        },
      });

      if (!isPollClosed(aPoll.endDate)) {
        aPoll.endDate = new Date();
      }

      const report = buildPollSummary(aPoll, pollResps);
      const chunks = splitStringIntoChunks(
        report,
        DISCORD_MESSAGE_LENGTH_LIMIT,
      );
      try {
        const url = Routes.channelMessages(channelId);
        for (const content of chunks) {
          await discordapi.post(url, {
            body: {
              content,
              allowed_mentions: { parse: [] },
            },
          });
        }
      } catch (error) {
        logger.error(error);
        return res.json(errorPayload(t('poll.report.failed')));
      }

      await em.persist(aPoll).flush();

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: t('poll.report.sent', { count: chunks.length }),
        },
      });
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
