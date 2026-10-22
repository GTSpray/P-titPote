import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { escapeModalTitle } from '../../../utils/escapeModalTitle.js';
import { t } from '../../../i18n/index.js';
import { GetPollQuery } from '../../../queries/poll/getPoll.query.js';
import { GetPollQueryHandler } from '../../../handlers/poll/getPoll.queryHandler.js';
import { createPollFinder } from '../../../repositories/poll/poll.finder.js';
import {
  MissingVoterRoleError,
  PollClosedError,
  PollNotFoundError,
} from '../../../errors/poll.errors.js';
import { PollVoteComputer } from '../../../handlers/poll/pollVote.computer.js';
import { Poll } from '../../../db/entities/Poll.entity.js';
import { PollStep } from '../../../db/entities/PollStep.entity.js';
import { PollResp } from '../../../db/entities/PollResp.entity.js';
import { NotFoundError } from '@mikro-orm/core';

export const pollResp: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const pollId = (<any>additionalData).d.pId;
    const previousCursor = (<any>additionalData).d.prevStep || 0;
    const { member } = req.body;

    if (dbServices && guildId && member) {
      const em = dbServices.orm.em.fork();
      const voteComputer = new PollVoteComputer();

      try {
        // Domain checks via GetPoll, then cursor page like the previous implementation.
        const aPollEntity = await new GetPollQueryHandler(
          createPollFinder(em),
        ).handle(new GetPollQuery({ guildId, pollId }));

        voteComputer.assertCanVote(aPollEntity, member.roles ?? []);

        const aPoll = await em.findOneOrFail(Poll, {
          server: { guildId },
          id: pollId,
        });

        const currentCursor = await em.findByCursor(PollStep, {
          where: {
            poll: aPoll,
          },
          first: 5,
          after: previousCursor,
          orderBy: { order: 'asc' },
          populate: ['choices'],
        });

        const pollResps = await em.findAll(PollResp, {
          where: { memberId: member.user.id, pollStep: { poll: aPoll } },
        });

        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: JSON.stringify({
              t: 'cta',
              d: {
                a: 'pollVote',
                pId: aPoll.id,
              },
            }),
            title: escapeModalTitle(aPoll.title),
            components: currentCursor.items.map((step) => {
              let sub;
              const resp = pollResps.find((e) => e.pollStep.id === step.id);
              if (step.choices.count() > 0) {
                sub = {
                  type: ComponentType.StringSelect,
                  custom_id: step.id,
                  placeholder: t('poll.response.placeholder'),
                  options: step.choices
                    .toArray()
                    .sort((a, b) => a.order - b.order)
                    .map(({ label, id }) => ({
                      label,
                      value: id,
                      default: (resp && resp?.pollChoice?.id === id) || false,
                      emoji: {
                        name: '▪️',
                      },
                    })),
                };
              } else {
                sub = {
                  type: ComponentType.TextInput,
                  custom_id: step.id,
                  style: TextInputStyle.Paragraph,
                  min_length: 1,
                  max_length: 400,
                  required: true,
                  value: resp?.content,
                };
              }
              return {
                type: ComponentType.Label,
                ...(step.description ? { description: step.description } : {}),
                label: step.question,
                component: sub,
              };
            }),
          },
        });
      } catch (error) {
        if (
          error instanceof PollNotFoundError ||
          error instanceof NotFoundError
        ) {
          return res.status(500).json({ error: t('errors.noPoll') });
        }
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
