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
import { PollAlreadyPublishedError } from '../../../cqrs/errors.js';
import { PollFinder, PollPersister } from '../../../db/model/index.js';
import {
  PublishPollCommand,
  PublishPollCommandHandler,
} from '../../../domain/poll/publishPollCommand.js';

export const pollPub: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const pollId = (<any>additionalData).d.pId as string;
    const guildId = req.body.guild_id;
    if (dbServices && guildId) {
      try {
        const poll = await new PublishPollCommandHandler({
          ...PollFinder,
          ...PollPersister,
        }).handle(new PublishPollCommand(pollId, guildId));

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
                      mention: poll.role ? ` <@&${poll.role}>` : '',
                    }),
                  },
                  {
                    type: ComponentType.TextDisplay,
                    content: poll.title,
                  },
                  ...(poll.endDate
                    ? [
                        {
                          type: ComponentType.TextDisplay,
                          content: t('poll.publish.endDate', {
                            date: formatDiscordTimestamp(poll.endDate),
                            relative: formatDiscordTimestamp(poll.endDate, 'R'),
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
