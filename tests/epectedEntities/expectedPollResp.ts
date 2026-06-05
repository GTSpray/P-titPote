import { PollStep } from "../../src/db/entities/PollStep.entity.js";
import { PollChoice } from "../../src/db/entities/PollChoice.entity.js";
import { PollResp } from "../../src/db/entities/PollResp.entity.js";

export const expectedPollResp = (opts: Partial<PollResp>): PollResp => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    memberId: expect.any(String),
    pollStep: expect.any(PollStep),
    pollChoice: expect.toBeOneOf([expect.any(PollChoice), null]),
    content: expect.toBeOneOf([expect.any(String), null]),
    ...opts,
  };
};
