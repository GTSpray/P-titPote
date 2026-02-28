import { Collection } from "@mikro-orm/mariadb";
import { DiscordGuild } from "../../src/db/entities/DiscordGuild.entity.js";
import { Poll } from "../../src/db/entities/Poll.entity.js";
import { PollStep } from "../../src/db/entities/PollStep.entity.js";

export const expectedPoll = (opts: Partial<Poll>): Poll => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    role: expect.toBeOneOf([expect.any(String), null]),
    server: expect.any(DiscordGuild),
    steps: expect.any(Collection<PollStep>),
    title: expect.any(String),
    ...opts,
  };
};
