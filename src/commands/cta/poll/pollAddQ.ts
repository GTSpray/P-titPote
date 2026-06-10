import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { Poll } from '../../../db/entities/Poll.entity.js';
import {
  doNotUpdatePublishedPoll,
  errorPayload,
  notAllowed,
} from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

export const POLL_STEP_LIMIT = 4;
export const pollAddQ: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      const em = dbServices.orm.em.fork();
      const pollId = (<any>additionalData).d.pId;
      const aPoll = await em.findOne(
        Poll,
        { id: pollId, server: { guildId } },
        {
          populate: ['steps'],
        },
      );

      if (!aPoll) {
        return res.json(notAllowed());
      }

      if (aPoll.publicationDate != null) {
        return res.json(doNotUpdatePublishedPoll());
      }

      if (aPoll.steps.count() >= POLL_STEP_LIMIT) {
        return res.json(errorPayload(t('errors.tooMany')));
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
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
