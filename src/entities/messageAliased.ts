import type { Timestamps } from './common.js';

export type MessageAliased = Timestamps & {
  id: string;
  guildId: string;
  alias: string;
  message: string;
};
