import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { logger } from '../../../logger.js';
import { assertInteractionUserIsModerator } from '../../assert/assertInteractionUserIsModerator.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import {
  PollLockingFinder,
  PollPersister,
  PollResponseLister,
} from '../../../db/model/index.js';
import {
  PublishPollReportCommand,
  PublishPollReportCommandHandler,
} from '../../../domain/poll/publishPollReportCommand.js';

export const pollSummary: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    try {
      assertInteractionUserIsModerator(req.body);
    } catch (error) {
      logger.error(error);
      return res.json(notAllowed());
    }

    const pollId = (<any>additionalData).d.pId as string;
    const guildId = req.body.guild_id;
    const channelId = req.body.channel?.id;
    if (dbServices && guildId && channelId) {
      const result = await new PublishPollReportCommandHandler(
        { ...PollLockingFinder, ...PollPersister },
        PollResponseLister,
      ).handle(new PublishPollReportCommand(pollId, guildId, channelId));

      if (!result.sent) {
        return res.json(errorPayload(t('poll.report.failed')));
      }

      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: t('poll.report.sent', { count: result.count }),
        },
      });
    }

    return res.status(500).json({ error: t('errors.unknown') });
  },
};
