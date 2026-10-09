import type { Timestamps } from './common.js';
import type { PollChoice } from './pollChoice.js';

export type PollStep = Timestamps & {
  id: string;
  pollId: string;
  question: string;
  description: string | null;
  order: number;
  choices: PollChoice[];
  pollPublicationDate: Date | null;
};
