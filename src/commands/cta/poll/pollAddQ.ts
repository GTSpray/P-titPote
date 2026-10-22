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
import { GetPollQuery } from '../../../queries/poll/getPoll.query.js';
import { GetPollQueryHandler } from '../../../handlers/poll/getPoll.queryHandler.js';
import { createPollFinder } from '../../../repositories/poll/poll.finder.js';
import {
  PollAlreadyPublishedError,
  PollStepLimitReachedError,
} from '../../../errors/poll.errors.js';
import { POLL_STEP_LIMIT } from '../../../handlers/poll/pollDraft.computer.js';

export { POLL_STEP_LIMIT };

export const pollAddQ: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const pollId = (<any>additionalData).d.pId;
      const handler = new GetPollQueryHandler(createPollFinder(em));

      try {
        const aPoll = await handler.handle(
          new GetPollQuery({ guildId, pollId }),
        );

        if (aPoll.publicationDate !== null) {
          throw new PollAlreadyPublishedError();
        }

        if (aPoll.steps.length >= POLL_STEP_LIMIT) {
          throw new PollStepLimitReachedError();
        }

        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: JSON.stringify({
              t: 'cta',
              d: { a: 'pollCreate', pId: aPoll.id },
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
        if (error instanceof PollStepLimitReachedError) {
          return res.json(errorPayload(t('errors.tooMany')));
        }
        throw error;
      }
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
