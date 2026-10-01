import {
  ComponentSelect,
  ComponentSimple,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { ForbiddenError, VoteClosedError } from '../../../cqrs/errors.js';
import {
  PollLockingFinder,
  PollResponseBulkPersister,
  PollResponseLister,
} from '../../../db/model/index.js';
import {
  RecordPollVoteCommand,
  RecordPollVoteCommandHandler,
} from '../../../domain/poll/recordPollVoteCommand.js';

export const pollVote: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const { data, member } = req.body;
    if (dbServices && guildId && member && data) {
      const pollId = (<any>additionalData).d.pId as string;
      const componentIds = data.components
        .map((component) => component.component?.custom_id)
        .filter((id): id is string => Boolean(id));
      const answers = componentIds.map((stepId) => {
        const choice = getInputComponnentById<ComponentSelect>(data, stepId);
        const text = getInputComponnentById<ComponentSimple>(data, stepId);
        return {
          stepId,
          choiceId:
            choice && 'values' in choice.component
              ? (choice.component.values[0] ?? null)
              : null,
          content:
            text && 'value' in text.component
              ? (text.component.value ?? null)
              : null,
        };
      });

      try {
        await new RecordPollVoteCommandHandler(PollLockingFinder, {
          ...PollResponseLister,
          ...PollResponseBulkPersister,
        }).handle(
          new RecordPollVoteCommand(
            {
              pollId,
              memberId: member.user.id,
              roles: member.roles,
              answers,
            },
            guildId,
          ),
        );
        return res.json(errorPayload(t('poll.vote.success')));
      } catch (error) {
        if (error instanceof VoteClosedError) {
          return res.json(errorPayload(t('errors.voteClosed')));
        }
        if (error instanceof ForbiddenError) {
          return res.json(notAllowed());
        }
        throw error;
      }
    }
    return res.status(500).json({ error: t('errors.unknown') });
  },
};
