import type { Timestamps } from './common.js';

export type DiscordGuild = Timestamps & {
  id: string;
  guildId: string;
};
