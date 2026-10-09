import type { Finder, PaginatedLister } from '../../cqrs/contracts.js';
import { NotFoundError } from '../../cqrs/errors.js';
import type { PollStep } from '../../entities/pollStep.js';
import { PollStep as PollStepModel } from '../entities/PollStep.entity.js';
import { pollStepToEntity } from './mapToEntity.js';
import { resolveEm } from './session.js';

export type PollStepCriteria = {
  id: string;
  guildId: string;
};

export type PollStepPageCriteria = {
  pollId: string;
};

export const PollStepFinder: Finder<PollStep, PollStepCriteria> = {
  async findOrFail(criteria, transaction) {
    const em = await resolveEm(transaction);
    const model = await em.findOne(
      PollStepModel,
      { id: criteria.id, poll: { server: { guildId: criteria.guildId } } },
      { populate: ['poll', 'choices', 'choices.pollstep'] },
    );
    if (!model) {
      throw new NotFoundError('Poll step does not exist', criteria);
    }
    return pollStepToEntity(model);
  },
};

export const PollStepPageLister: PaginatedLister<
  PollStepPageCriteria,
  PollStep
> = {
  async list(criteria, options, transaction) {
    const em = await resolveEm(transaction);
    const cursor = await em.findByCursor(PollStepModel, {
      where: { poll: criteria.pollId },
      first: options.limit ?? 5,
      after:
        typeof options.after === 'string' && options.after.length > 0
          ? options.after
          : undefined,
      orderBy: { order: 'asc' },
      populate: ['choices', 'choices.pollstep', 'poll'],
    });
    return { items: cursor.items.map((step) => pollStepToEntity(step)) };
  },
};
