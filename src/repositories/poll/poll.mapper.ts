import { Poll } from '../../db/entities/Poll.entity.js';
import { PollStep } from '../../db/entities/PollStep.entity.js';
import { PollChoice } from '../../db/entities/PollChoice.entity.js';
import { PollResp } from '../../db/entities/PollResp.entity.js';
import type {
  PollChoiceEntity,
  PollEntity,
  PollRespEntity,
  PollStepEntity,
} from '../../entities/poll.entity.js';

export function pollChoiceRecordToEntity(record: PollChoice): PollChoiceEntity {
  return {
    id: record.id,
    label: record.label,
    order: record.order,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}

export function pollStepRecordToEntity(record: PollStep): PollStepEntity {
  const choices = record.choices.isInitialized()
    ? record.choices
        .getItems()
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(pollChoiceRecordToEntity)
    : [];

  return {
    id: record.id,
    question: record.question,
    description: record.description ?? null,
    order: record.order,
    choices,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}

/** Only this module is allowed to know the MikroORM shape of Poll*. */
export function pollRecordToEntity(record: Poll): PollEntity {
  const steps = record.steps.isInitialized()
    ? record.steps
        .getItems()
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(pollStepRecordToEntity)
    : [];

  return {
    id: record.id,
    title: record.title,
    role: record.role ?? null,
    serverId: record.server.id,
    publicationDate: record.publicationDate ?? null,
    endDate: record.endDate ?? null,
    steps,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}

export function pollRespRecordToEntity(record: PollResp): PollRespEntity {
  return {
    id: record.id,
    memberId: record.memberId,
    pollStepId: record.pollStep.id,
    pollChoiceId: record.pollChoice?.id ?? null,
    content: record.content ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}
