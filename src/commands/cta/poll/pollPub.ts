import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { Poll } from '../../../db/entities/Poll.entity.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { notAllowed, doNotUpdatePublishedPoll } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';

export const pollPub: ModalHandlerDelcaration<CTAData> = {
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
      const aPoll = await em.findOneOrFail(
        Poll,
        { id: pollId, server: { guildId } },
        {
          populate: ['steps', 'steps.choices'],
        },
      );

      if (aPoll.publicationDate != null) {
        return res.json(doNotUpdatePublishedPoll());
      }

      aPoll.publicationDate = new Date();

      await em.persist(aPoll).flush();

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.IsComponentsV2,
          components: [
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: t('poll.publish.header', {
                    mention: aPoll.role ? ` <@&${aPoll.role}>` : '',
                  }),
                },
                {
                  type: ComponentType.TextDisplay,
                  content: aPoll.title,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: `https://raw.githubusercontent.com/GTSpray/P-titPote/main/assets/ptitpote-sam.png?salt=${pollId}`,
                },
              },
            },
            {
              type: ComponentType.Separator,
              divider: true,
              spacing: 1,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Primary,
                  label: t('poll.button.vote'),
                  custom_id: JSON.stringify({
                    t: 'cta',
                    d: {
                      a: 'pollResp',
                      pId: pollId,
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
