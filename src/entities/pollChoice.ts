import type { Timestamps } from './common.js';

export type PollChoice = Timestamps & {
  id: string;
  pollStepId: string;
  label: string;
  order: number;
};
