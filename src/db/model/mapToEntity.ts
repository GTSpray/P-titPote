import { Collection } from '@mikro-orm/core';
import type { DiscordGuild as DiscordGuildModel } from '../entities/DiscordGuild.entity.js';
import type { MessageAliased as MessageAliasedModel } from '../entities/MessageAliased.entity.js';
import type { Poll as PollModel } from '../entities/Poll.entity.js';
import type { PollChoice as PollChoiceModel } from '../entities/PollChoice.entity.js';
import type { PollResp as PollRespModel } from '../entities/PollResp.entity.js';
import type { PollStep as PollStepModel } from '../entities/PollStep.entity.js';
import type { DiscordGuild } from '../../entities/discordGuild.js';
import type { MessageAliased } from '../../entities/messageAliased.js';
import type { Poll } from '../../entities/poll.js';
import type { PollChoice } from '../../entities/pollChoice.js';
import type { PollResponse } from '../../entities/pollResponse.js';
import type { PollStep } from '../../entities/pollStep.js';

function itemsOf<T extends object>(value: Collection<T> | undefined): T[] {
  if (!value || !value.isInitialized()) {
    return [];
  }
  return value.getItems();
}

export function discordGuildToEntity(model: DiscordGuildModel): DiscordGuild {
  return {
    id: model.id,
    guildId: model.guildId,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    deletedAt: model.deletedAt,
  };
}

export function messageAliasedToEntity(
  model: MessageAliasedModel,
): MessageAliased {
  return {
    id: model.id,
    guildId: model.server.guildId,
    alias: model.alias,
    message: model.message,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    deletedAt: model.deletedAt,
  };
}

export function pollChoiceToEntity(
  model: PollChoiceModel,
  pollStepId?: string,
): PollChoice {
  return {
    id: model.id,
    pollStepId: pollStepId ?? model.pollstep.id,
    label: model.label,
    order: model.order,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    deletedAt: model.deletedAt,
  };
}

export function pollStepToEntity(
  model: PollStepModel,
  parent?: { id: string; publicationDate: Date | null },
): PollStep {
  const publicationDate =
    parent?.publicationDate ?? model.poll?.publicationDate ?? null;
  return {
    id: model.id,
    pollId: parent?.id ?? model.poll.id,
    question: model.question,
    description: model.description ?? null,
    order: model.order,
    choices: itemsOf(model.choices)
      .map((choice) => pollChoiceToEntity(choice, model.id))
      .sort((a, b) => a.order - b.order),
    pollPublicationDate: publicationDate,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    deletedAt: model.deletedAt,
  };
}

export function pollToEntity(model: PollModel): Poll {
  const publicationDate = model.publicationDate ?? null;
  return {
    id: model.id,
    guildId: model.server.guildId,
    title: model.title,
    role: model.role ?? null,
    endDate: model.endDate ?? null,
    publicationDate,
    steps: itemsOf(model.steps)
      .map((step) => pollStepToEntity(step, { id: model.id, publicationDate }))
      .sort((a, b) => a.order - b.order),
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    deletedAt: model.deletedAt,
  };
}

export function pollResponseToEntity(model: PollRespModel): PollResponse {
  return {
    id: model.id,
    memberId: model.memberId,
    pollStepId: model.pollStep.id,
    pollChoiceId: model.pollChoice?.id ?? null,
    content: model.content ?? null,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    deletedAt: model.deletedAt,
  };
}
