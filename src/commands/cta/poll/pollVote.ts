import {
  ComponentSelect,
  ComponentSimple,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { errorPayload } from '../../commonMessages.js';
import { Poll } from '../../../db/entities/Poll.entity.js';
import { PollResp } from '../../../db/entities/PollResp.entity.js';
import { t } from '../../../i18n/index.js';
import { isPollClosed } from '../../../utils/pollDates.js';

export const pollVote: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const { data, member } = req.body;
    if (dbServices && guildId && member) {
      const em = dbServices.orm.em.fork();

      const pollId = (<any>additionalData).d.pId;
      const aPoll = await em.findOneOrFail(
        Poll,
        { id: <string>pollId },
        {
          populate: ['steps', 'steps.choices'],
        },
      );

      if (isPollClosed(aPoll.endDate)) {
        return res.json(errorPayload(t('errors.voteClosed')));
      }

      const pollResps = await em.findAll(PollResp, {
        where: { memberId: member.user.id, pollStep: { poll: aPoll } },
      });

      const resps = aPoll.steps.getItems().map((step) => {
        const resp =
          pollResps.find((pr) => pr.pollStep.id === step.id) ??
          new PollResp(member.user.id, step);
        if (step.choices.length > 0) {
          const qRespChoice = getInputComponnentById<ComponentSelect>(
            data,
            step.id,
          );
          resp.pollChoice = step.choices.find(
            (e) => e.id === qRespChoice?.component.values[0],
          );
        } else {
          const qRespValue = getInputComponnentById<ComponentSimple>(
            data,
            step.id,
          );
          resp.content = <string>qRespValue?.component.value;
        }
        return resp;
      });

      await em.persist(resps).flush();

      return res.json(errorPayload(t('poll.vote.success')));
    }
    return res.status(500).json({ error: t('errors.unknown') });
  },
};
