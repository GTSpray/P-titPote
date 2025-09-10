import { Collection } from "@mikro-orm/core";
import { DiscordGuild } from "../../src/db/entities/DiscordGuild.entity.js";
import { MessageAliased } from "../../src/db/entities/MessageAliased.entity.js";

export const expectedDiscordGuild = (
  opts: Partial<DiscordGuild>,
): DiscordGuild => {
  return {
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    deletedAt: expect.any(Date),
    guildId: expect.any(String),
    id: expect.any(String),
    messageAliaseds: expect.any(Collection<MessageAliased>),
    ...opts,
  };
};
