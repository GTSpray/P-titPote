import { PollStep } from "../../src/db/entities/PollStep.entity.js";
import { PollChoice } from "../../src/db/entities/PollChoice.entity.js";

export const expectedPollChoice = (opts: Partial<PollChoice>): PollChoice => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    label: expect.any(String),
    pollstep: expect.any(PollStep),
    order: expect.any(Number),
    ...opts,
  };
};
