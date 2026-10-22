import type { EntityManager } from '@mikro-orm/core';
import { Poll } from '../../db/entities/Poll.entity.js';
import { PollStep } from '../../db/entities/PollStep.entity.js';
import { PollChoice } from '../../db/entities/PollChoice.entity.js';
import { DiscordGuild } from '../../db/entities/DiscordGuild.entity.js';
import type { Persister } from '../repository.js';
import type { PollEntity } from '../../entities/poll.entity.js';

export function createPollPersister(em: EntityManager): Persister<PollEntity> {
  return {
    async persist(entity) {
      const existing = await em.findOne(
        Poll,
        { id: entity.id },
        { populate: ['steps', 'steps.choices'] },
      );

      const record = existing ?? new Poll(entity.title, entity.role ?? undefined);

      if (!existing) {
        record.id = entity.id;
        record.server = em.getReference(DiscordGuild, entity.serverId);
        record.createdAt = entity.createdAt;
        record.deletedAt = entity.deletedAt;
      }

      record.title = entity.title;
      record.role = entity.role;
      record.publicationDate = entity.publicationDate ?? undefined;
      record.endDate = entity.endDate ?? undefined;
      record.updatedAt = entity.updatedAt;
      record.deletedAt = entity.deletedAt;

      for (const stepEntity of entity.steps) {
        let step = record.steps
          .getItems()
          .find((item) => item.id === stepEntity.id);
        if (!step) {
          step = new PollStep(stepEntity.question, stepEntity.order);
          step.id = stepEntity.id;
          step.createdAt = stepEntity.createdAt;
          step.deletedAt = stepEntity.deletedAt;
          record.steps.add(step);
        }
        step.question = stepEntity.question;
        step.description = (stepEntity.description ??
          null) as unknown as string;
        step.order = stepEntity.order;
        step.updatedAt = stepEntity.updatedAt;
        step.deletedAt = stepEntity.deletedAt;

        for (const choiceEntity of stepEntity.choices) {
          let choice = step.choices
            .getItems()
            .find((item) => item.id === choiceEntity.id);
          if (!choice) {
            choice = new PollChoice(choiceEntity.label, choiceEntity.order);
            choice.id = choiceEntity.id;
            choice.createdAt = choiceEntity.createdAt;
            choice.deletedAt = choiceEntity.deletedAt;
            step.choices.add(choice);
          }
          choice.label = choiceEntity.label;
          choice.order = choiceEntity.order;
          choice.updatedAt = choiceEntity.updatedAt;
          choice.deletedAt = choiceEntity.deletedAt;
        }
      }

      em.persist(record);
    },
  };
}
