import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import {
  notAllowed,
  errorPayload,
  doNotUpdatePublishedPoll,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  PollAlreadyPublishedError,
  TooManyError,
} from '../../../cqrs/errors.js';
import { PollStepFinder } from '../../../db/model/index.js';
import {
  GetPollStepQuery,
  GetPollStepQueryHandler,
} from '../../../domain/poll/getPollStepQuery.js';
import { STEP_CHOICE_LIMIT } from '../../../domain/poll/pollDraftAssert.js';

export { STEP_CHOICE_LIMIT };

export const pollAddC: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      const questionId = (<any>additionalData).d.sId as string;
      try {
        const step = await new GetPollStepQueryHandler(PollStepFinder).handle(
          new GetPollStepQuery(questionId, guildId),
        );
        const startIndex = step.choices.length;
        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: JSON.stringify({
              t: 'cta',
              d: { a: 'pollCreate', pId: step.pollId },
            }),
            title: t('poll.modal.addChoices.title'),
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `# ${step.question}\n${step.choices.map((choice) => choice.label).join('\n')}`,
              },
              ...Array.from({
                length: Math.min(4, STEP_CHOICE_LIMIT - startIndex),
              }).map((_entry, i) => {
                const choiceOrder = startIndex + i + 1;
                return {
                  type: ComponentType.Label,
                  label: t('poll.modal.label.choice', { order: choiceOrder }),
                  component: {
                    type: ComponentType.TextInput,
                    custom_id: `choice${choiceOrder}`,
                    style: TextInputStyle.Short,
                    min_length: 1,
                    max_length: 100,
                    required: choiceOrder <= 2,
                  },
                };
              }),
            ],
          },
        });
      } catch (error) {
        if (error instanceof PollAlreadyPublishedError) {
          return res.json(doNotUpdatePublishedPoll());
        }
        if (error instanceof TooManyError) {
          return res.json(errorPayload(t('errors.tooMany')));
        }
        throw error;
      }
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
