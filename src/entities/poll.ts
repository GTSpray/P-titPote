import type { Timestamps } from './common.js';
import type { PollStep } from './pollStep.js';

export type Poll = Timestamps & {
  id: string;
  guildId: string;
  title: string;
  role: string | null;
  endDate: Date | null;
  publicationDate: Date | null;
  steps: PollStep[];
};
