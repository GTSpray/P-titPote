import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import {
  ComponentSelect,
  ComponentSimple,
  CTAData,
  getInputComponnentById,
  getInputComponnentsByPrefix,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import {
  doNotUpdatePublishedPoll,
  errorPayload,
  notAllowed,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { formatDiscordTimestamp } from '../../../utils/pollDates.js';
import {
  PollAlreadyPublishedError,
  TooManyError,
} from '../../../cqrs/errors.js';
import type { Poll } from '../../../entities/poll.js';
import {
  DiscordGuildPersister,
  DiscordGuildTryFinder,
  PollFinder,
  PollPersister,
} from '../../../db/model/index.js';
import {
  CreatePollCommand,
  CreatePollCommandHandler,
} from '../../../domain/poll/createPollCommand.js';
import {
  AppendPollDraftCommand,
  AppendPollDraftCommandHandler,
} from '../../../domain/poll/appendPollDraftCommand.js';

const getSummary = (poll: Poll) => {
  const steps = [...poll.steps].sort((a, b) => a.order - b.order);
  const summaryLines = [
    `## ${poll.title}`,
    ...(poll.endDate
      ? [
          t('poll.publish.endDate', {
            date: formatDiscordTimestamp(poll.endDate),
            relative: formatDiscordTimestamp(poll.endDate, 'R'),
          }),
        ]
      : []),
    '',
    ...steps.reduce(
      (acc: string[], step) => [
        ...acc,
        `${step.order + 1}. ${step.question}`,
        ...[...step.choices]
          .sort((a, b) => a.order - b.order)
          .map((choice) => `    - ${choice.label}`),
      ],
      [],
    ),
  ];
  return summaryLines.join('\n');
};

export const pollCreate: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }
    const guildId = req.body.guild_id;
    const { data } = req.body;
    if (dbServices && guildId) {
      const pollId = (<any>additionalData).d.pId as string | undefined;
      let poll: Poll;
      try {
        if (!pollId) {
          const title = getInputComponnentById<ComponentSimple>(data, 'title');
          const role = getInputComponnentById<ComponentSelect>(data, 'role');
          const question = getInputComponnentById<ComponentSimple>(
            data,
            'question',
          );
          const qDesc = getInputComponnentById<ComponentSimple>(
            data,
            'description',
          );
          poll = await new CreatePollCommandHandler(
            { ...DiscordGuildTryFinder, ...DiscordGuildPersister },
            { ...PollPersister, ...PollFinder },
          ).handle(
            new CreatePollCommand(
              {
                title: `${title?.component.value}`,
                role: role?.component.values[0] ?? null,
                question: `${question?.component.value}`,
                description: qDesc?.component.value ?? null,
              },
              guildId,
            ),
          );
        } else {
          const newQuestion = getInputComponnentById<ComponentSimple>(
            data,
            'question',
          );
          const qDesc = getInputComponnentById<ComponentSimple>(
            data,
            'description',
          );
          const newChoices = getInputComponnentsByPrefix<ComponentSimple>(
            data,
            'choice',
          ).map((choice) => `${choice.component.value}`);
          poll = await new AppendPollDraftCommandHandler({
            ...PollFinder,
            ...PollPersister,
          }).handle(
            new AppendPollDraftCommand(
              {
                pollId,
                question: newQuestion ? `${newQuestion.component.value}` : null,
                description: qDesc?.component.value ?? null,
                choices: newChoices,
              },
              guildId,
            ),
          );
        }
      } catch (error) {
        if (error instanceof PollAlreadyPublishedError) {
          return res.json(doNotUpdatePublishedPoll());
        }
        if (error instanceof TooManyError) {
          return res.json(errorPayload(t('errors.tooMany')));
        }
        throw error;
      }

      const lastStep = [...poll.steps].sort((a, b) => a.order - b.order).at(-1);
      if (!lastStep) {
        return res.status(500).json({ error: t('errors.unknown') });
      }

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: getSummary(poll),
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: t('poll.button.addChoices'),
                  custom_id: JSON.stringify({
                    t: 'cta',
                    d: {
                      a: 'pollAddC',
                      sId: lastStep.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: t('poll.button.newQuestion'),
                  custom_id: JSON.stringify({
                    t: 'cta',
                    d: {
                      a: 'pollAddQ',
                      pId: poll.id,
                    },
                  }),
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: t('poll.button.publish'),
                  custom_id: JSON.stringify({
                    t: 'cta',
                    d: {
                      a: 'pollPub',
                      pId: poll.id,
                    },
                  }),
                },
              ],
            },
          ],
        },
      });
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
