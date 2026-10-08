import {
  CTAData,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { t } from '../../../i18n/index.js';
import { SubmitPollVoteQuery } from '../../../queries/poll/submitPollVote.query.js';
import { SubmitPollVoteQueryHandler } from '../../../handlers/poll/submitPollVote.queryHandler.js';
import { PollVoteComputer } from '../../../handlers/poll/pollVote.computer.js';
import {
  MissingVoterRoleError,
  PollClosedError,
} from '../../../errors/poll.errors.js';

export const pollVote: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const { data, member } = req.body;
    if (dbServices && guildId && member) {
      const em = dbServices.orm.em.fork();
      const pollId = (<any>additionalData).d.pId;
      const handler = new SubmitPollVoteQueryHandler(
        em,
        new PollVoteComputer(),
      );

      try {
        await handler.handle(
          new SubmitPollVoteQuery({
            guildId,
            pollId,
            memberId: member.user.id,
            memberRoles: member.roles ?? [],
            modalData: data,
          }),
        );

        return res.json(errorPayload(t('poll.vote.success')));
      } catch (error) {
        if (error instanceof PollClosedError) {
          return res.json(errorPayload(t('errors.voteClosed')));
        }
        if (error instanceof MissingVoterRoleError) {
          return res.json(notAllowed());
        }
        throw error;
      }
    }
    return res.status(500).json({ error: t('errors.unknown') });
  },
};
