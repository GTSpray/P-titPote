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
import { GetPollStepQuery } from '../../../queries/poll/getPollStep.query.js';
import { GetPollStepQueryHandler } from '../../../handlers/poll/getPollStep.queryHandler.js';
import { createPollStepFinder } from '../../../repositories/poll/pollStep.finder.js';
import {
  PollAlreadyPublishedError,
  PollChoiceLimitReachedError,
} from '../../../errors/poll.errors.js';
import { STEP_CHOICE_LIMIT } from '../../../handlers/poll/pollDraft.computer.js';

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
      const em = dbServices.orm.em.fork();
      const questionId = (<any>additionalData).d.sId;
      const handler = new GetPollStepQueryHandler(createPollStepFinder(em));

      try {
        const aPollStep = await handler.handle(
          new GetPollStepQuery({ guildId, stepId: questionId }),
        );

        const startIndex = aPollStep.choices.length;
        if (aPollStep.publicationDate !== null) {
          throw new PollAlreadyPublishedError();
        }

        if (startIndex >= STEP_CHOICE_LIMIT) {
          throw new PollChoiceLimitReachedError();
        }

        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: JSON.stringify({
              t: 'cta',
              d: { a: 'pollCreate', pId: aPollStep.pollId },
            }),
            title: t('poll.modal.addChoices.title'),
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `# ${aPollStep.question}\n${aPollStep.choices.map((e) => e.label).join('\n')}`,
              },
              ...Array.from({
                length: Math.min(4, STEP_CHOICE_LIMIT - startIndex),
              }).map((_e, i) => {
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
        if (error instanceof PollChoiceLimitReachedError) {
          return res.json(errorPayload(t('errors.tooMany')));
        }
        throw error;
      }
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
