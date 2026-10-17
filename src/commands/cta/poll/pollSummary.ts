import { InteractionResponseType, MessageFlags, Routes } from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { discordapi } from '../../../utils/discordapi.js';
import { ClosePollReportQuery } from '../../../queries/poll/closePollReport.query.js';
import { ClosePollReportQueryHandler } from '../../../handlers/poll/closePollReport.queryHandler.js';
import { PollReportComputer } from '../../../handlers/poll/pollReport.computer.js';
import { PollReportPublishError } from '../../../errors/poll.errors.js';

export const pollSummary: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const pollId = (<any>additionalData).d.pId;
    const guildId = req.body.guild_id;
    const channelId = req.body.channel?.id;
    if (dbServices && guildId && channelId) {
      const em = dbServices.orm.em.fork();
      const handler = new ClosePollReportQueryHandler(
        em,
        new PollReportComputer(),
        {
          async publish(chunks) {
            const url = Routes.channelMessages(channelId);
            for (const content of chunks) {
              await discordapi.post(url, {
                body: {
                  content,
                  allowed_mentions: { parse: [] },
                },
              });
            }
          },
        },
      );

      try {
        const result = await handler.handle(
          new ClosePollReportQuery({ guildId, pollId }),
        );

        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            flags: MessageFlags.Ephemeral,
            content: t('poll.report.sent', { count: result.chunkCount }),
          },
        });
      } catch (error) {
        if (error instanceof PollReportPublishError) {
          logger.error(error);
          return res.json(errorPayload(t('poll.report.failed')));
        }
        throw error;
      }
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
