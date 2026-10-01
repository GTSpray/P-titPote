import type { Timestamps } from './common.js';

export type PollResponse = Timestamps & {
  id: string;
  memberId: string;
  pollStepId: string;
  pollChoiceId: string | null;
  content: string | null;
};
