import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { CTAData, ModalHandlerDelcaration } from '../../modals.js';
import { errorPayload, notAllowed } from '../../commonMessages.js';
import { escapeModalTitle } from '../../../utils/escapeModalTitle.js';
import { t } from '../../../i18n/index.js';
import { ForbiddenError, VoteClosedError } from '../../../cqrs/errors.js';
import type { PollResponse } from '../../../entities/pollResponse.js';
import type { PollStep } from '../../../entities/pollStep.js';
import {
  PollResponseLister,
  PollStepPageLister,
  PollTryFinder,
} from '../../../db/model/index.js';
import {
  OpenPollVoteQuery,
  OpenPollVoteQueryHandler,
} from '../../../domain/poll/openPollVoteQuery.js';

function choiceDefault(step: PollStep, responses: PollResponse[], id: string) {
  const resp = responses.find((response) => response.pollStepId === step.id);
  return (resp && resp.pollChoiceId === id) || false;
}

export const pollResp: ModalHandlerDelcaration<CTAData> = {
  async handler({ req, res, additionalData, dbServices }) {
    const guildId = req.body.guild_id;
    const pollId = (<any>additionalData).d.pId as string;
    const previousCursor = (<any>additionalData).d.prevStep || 0;
    const { member } = req.body;

    if (dbServices && guildId && member) {
      try {
        const opened = await new OpenPollVoteQueryHandler(
          PollTryFinder,
          PollStepPageLister,
          PollResponseLister,
        ).handle(
          new OpenPollVoteQuery(
            pollId,
            guildId,
            member.user.id,
            member.roles,
            previousCursor,
          ),
        );
        if (!opened) {
          return res.status(500).json({ error: t('errors.noPoll') });
        }

        return res.json({
          type: InteractionResponseType.Modal,
          data: {
            custom_id: JSON.stringify({
              t: 'cta',
              d: {
                a: 'pollVote',
                pId: opened.poll.id,
              },
            }),
            title: escapeModalTitle(opened.poll.title),
            components: opened.steps.map((step) => {
              let sub;
              const resp = opened.responses.find(
                (response) => response.pollStepId === step.id,
              );
              if (step.choices.length > 0) {
                sub = {
                  type: ComponentType.StringSelect,
                  custom_id: step.id,
                  placeholder: t('poll.response.placeholder'),
                  options: [...step.choices]
                    .sort((a, b) => a.order - b.order)
                    .map(({ label, id }) => ({
                      label,
                      value: id,
                      default: choiceDefault(step, opened.responses, id),
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
