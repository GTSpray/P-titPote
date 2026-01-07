import { Collection } from "@mikro-orm/mariadb";
import { PollStep } from "../../src/db/entities/PollStep.entity.js";
import { PollChoice } from "../../src/db/entities/PollChoice.entity.js";
import { Poll } from "../../src/db/entities/Poll.entity.js";

export const expectedPollStep = (opts: Partial<PollStep>): PollStep => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    poll: expect.any(Poll),
    question: expect.any(String),
    choices: expect.any(Collection<PollChoice>),
    order: expect.any(Number),
    ...opts,
  };
};
