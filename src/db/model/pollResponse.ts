import type { BulkPersister, Lister } from '../../cqrs/contracts.js';
import type { PollResponse } from '../../entities/pollResponse.js';
import { PollChoice as PollChoiceModel } from '../entities/PollChoice.entity.js';
import { PollResp as PollRespModel } from '../entities/PollResp.entity.js';
import { PollStep as PollStepModel } from '../entities/PollStep.entity.js';
import { pollResponseToEntity } from './mapToEntity.js';
import { resolveEm } from './session.js';

export type PollResponseCriteria = {
  pollId: string;
  memberId?: string;
};

export const PollResponseLister: Lister<PollResponseCriteria, PollResponse> = {
  async list(criteria, _options, transaction) {
    const em = await resolveEm(transaction);
    const models = await em.findAll(PollRespModel, {
      where: {
        ...(criteria.memberId ? { memberId: criteria.memberId } : {}),
        pollStep: { poll: criteria.pollId },
      },
      populate: ['pollStep', 'pollChoice'],
      orderBy: { createdAt: 'asc' },
    });
    return { items: models.map(pollResponseToEntity) };
  },
};

export const PollResponseBulkPersister: BulkPersister<PollResponse> = {
  async bulkPersist(responses, transaction) {
    const em = await resolveEm(transaction);
    const models: PollRespModel[] = [];
    for (const response of responses) {
      let model = await em.findOne(PollRespModel, {
        memberId: response.memberId,
        pollStep: response.pollStepId,
      });
      if (!model) {
        const step = await em.findOneOrFail(PollStepModel, response.pollStepId);
        model = new PollRespModel(response.memberId, step);
        model.id = response.id;
      }
      model.pollChoice = response.pollChoiceId
        ? await em.findOne(PollChoiceModel, response.pollChoiceId)
        : null;
      model.content = response.content;
      models.push(model);
    }
    if (models.length > 0) {
      em.persist(models);
      await em.flush();
    }
  },
};
