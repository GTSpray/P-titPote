import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { PollStep } from '../../../db/entities/PollStep.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import {
  notAllowed,
  errorPayload,
  doNotUpdatePublishedPoll,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

export const STEP_CHOICE_LIMIT = 25;
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
      const aPollStep = await em.findOneOrFail(
        PollStep,
        { id: questionId },
        {
          populate: ['poll', 'choices'],
        },
      );
      const startIndex = aPollStep.choices.count();

      if (aPollStep.poll.publicationDate !== null) {
        return res.json(doNotUpdatePublishedPoll());
      }

      if (startIndex >= STEP_CHOICE_LIMIT) {
        return res.json(errorPayload(t('errors.tooMany')));
      }

      return res.json({
        type: InteractionResponseType.Modal,
        data: {
          custom_id: JSON.stringify({
            t: 'cta',
            d: { a: 'pollCreate', pId: aPollStep.poll.id },
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
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
