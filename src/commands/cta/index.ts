import type { ModalHandlerDelcaration } from '../modals.js';
import { aliasRm } from './alias/aliasRm.js';
import { aliasSay } from './alias/aliasSay.js';
import { aliasSet } from './alias/aliasSet.js';
import { pollCreate } from './poll/pollCreate.js';
import { pollAddQ } from './poll/pollAddQ.js';
import { pollAddC } from './poll/pollAddC.js';
import { pollPub } from './poll/pollPub.js';
import { pollResp } from './poll/pollResp.js';
import { pollSummary } from './poll/pollSummary.js';
import { pollVote } from './poll/pollVote.js';

export const cta: Record<string, ModalHandlerDelcaration<any>> = {
  aliasRm,
  aliasSay,
  aliasSet,
  pollCreate,
  pollAddQ,
  pollAddC,
  pollPub,
  pollResp,
  pollSummary,
  pollVote,
};
