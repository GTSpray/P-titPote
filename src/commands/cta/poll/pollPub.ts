import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { notAllowed, doNotUpdatePublishedPoll } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { formatDiscordTimestamp } from '../../../utils/pollDates.js';
import { PublishPollQuery } from '../../../queries/poll/publishPoll.query.js';
import { PublishPollQueryHandler } from '../../../handlers/poll/publishPoll.queryHandler.js';
import { PollDraftComputer } from '../../../handlers/poll/pollDraft.computer.js';
import { createPollFinder } from '../../../repositories/poll/poll.finder.js';
import { createPollPersister } from '../../../repositories/poll/poll.persister.js';
import { PollAlreadyPublishedError } from '../../../errors/poll.errors.js';

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
      const handler = new PublishPollQueryHandler(
        em,
        {
          ...createPollFinder(em),
          ...createPollPersister(em),
        },
        new PollDraftComputer(),
      );

      try {
        const aPoll = await handler.handle(
          new PublishPollQuery({ guildId, pollId }),
        );

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
                  ...(aPoll.endDate
                    ? [
                        {
                          type: ComponentType.TextDisplay,
                          content: t('poll.publish.endDate', {
                            date: formatDiscordTimestamp(aPoll.endDate),
                            relative: formatDiscordTimestamp(aPoll.endDate, 'R'),
                          }),
                        },
                      ]
                    : []),
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
                  {
                    type: ComponentType.Button,
                    style: ButtonStyle.Secondary,
                    label: t('poll.button.report'),
                    custom_id: JSON.stringify({
                      t: 'cta',
                      d: {
                        a: 'pollSummary',
                        pId: pollId,
                      },
                    }),
                  },
                ],
              },
            ],
          },
        });
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
