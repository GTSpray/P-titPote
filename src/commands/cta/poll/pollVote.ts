import {
  ComponentSelect,
  ComponentSimple,
  CTAData,
  getInputComponnentById,
  ModalHandlerDelcaration,
} from '../../modals.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { Poll } from '../../../db/entities/Poll.entity.js';
import { PollResp } from '../../../db/entities/PollResp.entity.js';
import { t } from '../../../i18n/index.js';
import { isPollClosed } from '../../../utils/pollDates.js';
import { LockMode } from '@mikro-orm/core';

export const pollVote: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const { data, member } = req.body;
    if (dbServices && guildId && member) {
      const em = dbServices.orm.em.fork();

      const responsePayload = await em.transactional(async (tx) => {
        const pollId = (<any>additionalData).d.pId;
        const aPoll = await tx.findOneOrFail(
          Poll,
          { id: <string>pollId, server: { guildId } },
          {
            populate: ['steps', 'steps.choices'],
            lockMode: LockMode.PESSIMISTIC_WRITE,
          },
        );

        if (aPoll.role && !member.roles.includes(aPoll.role)) {
          return notAllowed();
        }

        if (isPollClosed(aPoll.endDate)) {
          return errorPayload(t('errors.voteClosed'));
        }

        const pollResps = await tx.findAll(PollResp, {
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

        await tx.persist(resps).flush();

        return errorPayload(t('poll.vote.success'));
      });

      return res.json(responsePayload);
    }
    return res.status(500).json({ error: t('errors.unknown') });
  },
};
