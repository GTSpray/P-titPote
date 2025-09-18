import { DiscordGuild } from "../../src/db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "../../src/db/entities/MessageAliased.entity.js";

export const expectedMessageAliased = (
  opts: Partial<MessageAliased>,
): MessageAliased => {
  return {
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    alias: expect.any(String),
    message: expect.any(String),
    server: expect.any(DiscordGuild),
    ...opts,
  };
};
