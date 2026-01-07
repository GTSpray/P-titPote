import { DiscordGuild } from "../../src/db/entities/DiscordGuild.entity.js";
import { Poll } from "../../src/db/entities/Poll.entity.js";

export const expectedPoll = (opts: Partial<Poll>): Poll => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    question: expect.any(String),
    role: expect.toBeOneOf([expect.any(String), null]),
    server: expect.any(DiscordGuild),
    ...opts,
  };
};
