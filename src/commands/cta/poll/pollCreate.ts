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
import { doNotUpdatePublishedPoll, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { formatDiscordTimestamp } from '../../../utils/pollDates.js';
import type { PollEntity } from '../../../entities/poll.entity.js';
import { CreatePollQuery } from '../../../queries/poll/createPoll.query.js';
import { AppendPollQuestionQuery } from '../../../queries/poll/appendPollQuestion.query.js';
import { AppendPollChoicesQuery } from '../../../queries/poll/appendPollChoices.query.js';
import { CreatePollQueryHandler } from '../../../handlers/poll/createPoll.queryHandler.js';
import { AppendPollQuestionQueryHandler } from '../../../handlers/poll/appendPollQuestion.queryHandler.js';
import { AppendPollChoicesQueryHandler } from '../../../handlers/poll/appendPollChoices.queryHandler.js';
import { PollDraftComputer } from '../../../handlers/poll/pollDraft.computer.js';
import { createPollFinder } from '../../../repositories/poll/poll.finder.js';
import { createPollPersister } from '../../../repositories/poll/poll.persister.js';
import { PollAlreadyPublishedError } from '../../../errors/poll.errors.js';

const getSummary = (aPoll: PollEntity) => {
  const summaryLines = [
    `## ${aPoll.title}`,
    ...(aPoll.endDate
      ? [
          t('poll.publish.endDate', {
            date: formatDiscordTimestamp(aPoll.endDate),
            relative: formatDiscordTimestamp(aPoll.endDate, 'R'),
          }),
        ]
      : []),
    '',
    ...aPoll.steps.reduce(
      (acc: string[], aStep) => [
        ...acc,
        `${aStep.order + 1}. ${aStep.question}`,
        ...aStep.choices.map((aChoice) => `    - ${aChoice.label}`),
      ],
      [],
    ),
  ];
  return summaryLines.join('\n');
};

const draftResponse = (aPoll: PollEntity) => {
  const lastStep = aPoll.steps[aPoll.steps.length - 1];
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: getSummary(aPoll),
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
                  pId: aPoll.id,
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
                  pId: aPoll.id,
                },
              }),
            },
          ],
        },
      ],
    },
  };
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
      const em = dbServices.orm.em.fork();
      const pollId = (<any>additionalData).d.pId;
      const computer = new PollDraftComputer();
      const repository = {
        ...createPollFinder(em),
        ...createPollPersister(em),
      };

      try {
        let aPoll: PollEntity;
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
          const handler = new CreatePollQueryHandler(
            em,
            createPollPersister(em),
            computer,
          );
          aPoll = await handler.handle(
            new CreatePollQuery({
              guildId,
              title: title?.component.value,
              question: question?.component.value,
              description: qDesc?.component.value ?? null,
              role: role?.component.values[0] ?? null,
            }),
          );
        } else {
          const newQuestion = getInputComponnentById<ComponentSimple>(
            data,
            'question',
          );
          const newChoices = getInputComponnentsByPrefix<ComponentSimple>(
            data,
            'choice',
          );

          if (newQuestion) {
            const qDesc = getInputComponnentById<ComponentSimple>(
              data,
              'description',
            );
            const handler = new AppendPollQuestionQueryHandler(
              em,
              repository,
              computer,
            );
            aPoll = await handler.handle(
              new AppendPollQuestionQuery({
                guildId,
                pollId,
                question: newQuestion.component.value,
                description: qDesc?.component.value ?? null,
              }),
            );
          } else if (newChoices.length > 0) {
            const choices = newChoices
              .map((e) => `${e.component.value}`.trim())
              .filter((e) => e !== '');
            const handler = new AppendPollChoicesQueryHandler(
              em,
              repository,
              computer,
            );
            aPoll = await handler.handle(
              new AppendPollChoicesQuery({
                guildId,
                pollId,
                choices,
              }),
            );
          } else {
            aPoll = await createPollFinder(em).findOrFail({
              guildId,
              pollId,
            });
          }
        }

        return res.json(draftResponse(aPoll));
      } catch (error) {
        if (error instanceof PollAlreadyPublishedError) {
          return res.json(doNotUpdatePublishedPoll());
        }
        throw error;
      }
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
