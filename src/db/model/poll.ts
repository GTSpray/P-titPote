import { LockMode } from '@mikro-orm/core';
import type {
  Finder,
  LockingFinder,
  Persister,
  TryFinder,
} from '../../cqrs/contracts.js';
import { NotFoundError } from '../../cqrs/errors.js';
import type { Transaction } from '../../cqrs/transaction.js';
import type { Poll } from '../../entities/poll.js';
import type { PollChoice } from '../../entities/pollChoice.js';
import type { PollStep } from '../../entities/pollStep.js';
import { DiscordGuild as DiscordGuildModel } from '../entities/DiscordGuild.entity.js';
import { Poll as PollModel } from '../entities/Poll.entity.js';
import { PollChoice as PollChoiceModel } from '../entities/PollChoice.entity.js';
import { PollStep as PollStepModel } from '../entities/PollStep.entity.js';
import { pollToEntity } from './mapToEntity.js';
import { rethrowAsNotFound } from './notFound.js';
import { resolveEm } from './session.js';

export type PollCriteria = {
  id: string;
  guildId: string;
};

const pollPopulate = [
  'server',
  'steps',
  'steps.choices',
  'steps.poll',
] as const;

async function loadPoll(
  criteria: PollCriteria,
  transaction?: Transaction,
): Promise<PollModel | null> {
  const em = await resolveEm(transaction);
  return em.findOne(
    PollModel,
    { id: criteria.id, server: { guildId: criteria.guildId } },
    { populate: [...pollPopulate] },
  );
}

export const PollTryFinder: TryFinder<Poll, PollCriteria> = {
  async find(criteria, transaction) {
    const model = await loadPoll(criteria, transaction);
    return model ? pollToEntity(model) : null;
  },
};

export const PollFinder: Finder<Poll, PollCriteria> = {
  async findOrFail(criteria, transaction) {
    const poll = await PollTryFinder.find(criteria, transaction);
    if (!poll) {
      throw new NotFoundError('Poll does not exist', criteria);
    }
    return poll;
  },
};

export const PollLockingFinder: LockingFinder<Poll, PollCriteria> = {
  async findOrFailForUpdate(criteria, transaction) {
    const em = await resolveEm(transaction);
    try {
      const model = await em.findOneOrFail(
        PollModel,
        { id: criteria.id, server: { guildId: criteria.guildId } },
        {
          populate: [...pollPopulate],
          lockMode: LockMode.PESSIMISTIC_WRITE,
        },
      );
      return pollToEntity(model);
    } catch (error) {
      rethrowAsNotFound(error, 'Poll does not exist', criteria);
    }
  },
};

function assignStep(pollModel: PollModel, step: PollStep): PollStepModel {
  let stepModel = pollModel.steps
    .getItems()
    .find((candidate) => candidate.id === step.id);
  if (!stepModel) {
    stepModel = new PollStepModel(step.question, step.order);
    stepModel.id = step.id;
    pollModel.steps.add(stepModel);
  }
  stepModel.question = step.question;
  stepModel.description = step.description as string;
  stepModel.order = step.order;
  for (const choice of step.choices) {
    assignChoice(stepModel, choice);
  }
  return stepModel;
}

function assignChoice(stepModel: PollStepModel, choice: PollChoice) {
  let choiceModel = stepModel.choices
    .getItems()
    .find((candidate) => candidate.id === choice.id);
  if (!choiceModel) {
    choiceModel = new PollChoiceModel(choice.label, choice.order);
    choiceModel.id = choice.id;
    stepModel.choices.add(choiceModel);
  }
  choiceModel.label = choice.label;
  choiceModel.order = choice.order;
}

export const PollPersister: Persister<Poll> = {
  async persist(poll, transaction) {
    const em = await resolveEm(transaction);
    const guild = await em.findOneOrFail(DiscordGuildModel, {
      guildId: poll.guildId,
    });
    const loaded = await em.findOne(
      PollModel,
      { id: poll.id },
      { populate: ['steps', 'steps.choices'] },
    );
    let model: PollModel;
    if (!loaded) {
      model = new PollModel(poll.title, poll.role ?? undefined);
      model.id = poll.id;
      model.server = guild;
    } else {
      model = loaded;
    }
    model.title = poll.title;
    model.role = poll.role;
    (model as { endDate: Date | null }).endDate = poll.endDate;
    (model as { publicationDate: Date | null }).publicationDate =
      poll.publicationDate;
    for (const step of poll.steps) {
      assignStep(model, step);
    }
    em.persist(model);
    await em.flush();
  },
};
