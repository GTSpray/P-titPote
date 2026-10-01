import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import {
  doNotUpdatePublishedPoll,
  errorPayload,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  PollAlreadyPublishedError,
  TooManyError,
} from '../../../cqrs/errors.js';
import { PollFinder } from '../../../db/model/index.js';
import { GetPollOrFailQueryHandler } from '../../../domain/poll/getPollQuery.js';
import { assertCanAddStep } from '../../../domain/poll/pollDraftAssert.js';

export { POLL_STEP_LIMIT } from '../../../domain/poll/pollDraftAssert.js';

export const pollAddQ: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      const pollId = (<any>additionalData).d.pId as string;
      try {
        const poll = await new GetPollOrFailQueryHandler(PollFinder).handle({
          pollId,
          guildId,
        });
        assertCanAddStep(poll);
        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: JSON.stringify({
              t: 'cta',
              d: { a: 'pollCreate', pId: poll.id },
            }),
            title: t('poll.modal.addQuestion.title'),
            components: [
              {
                type: ComponentType.Label,
                label: t('poll.modal.label.question'),
                component: {
                  type: ComponentType.TextInput,
                  custom_id: `question`,
                  style: TextInputStyle.Short,
                  min_length: 1,
                  max_length: 45,
                  required: true,
                },
              },
              {
                type: ComponentType.Label,
                label: t('poll.modal.label.description'),
                component: {
                  type: ComponentType.TextInput,
                  custom_id: `description`,
                  style: TextInputStyle.Short,
                  min_length: 1,
                  max_length: 100,
                  required: false,
                },
              },
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
