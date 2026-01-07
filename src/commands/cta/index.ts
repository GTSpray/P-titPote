import type { ModalHandlerDelcaration } from "../modals.js";
import { pollCreate } from "./poll/pollCreate.js";
import { pollAddQ } from "./poll/pollAddQ.js";
import { pollAddC } from "./poll/pollAddC.js";
import { pollPub } from "./poll/pollPub.js";
import { pollResp } from "./poll/pollResp.js";

export const cta: Record<string, ModalHandlerDelcaration<any>> = {
  pollCreate,
  pollAddQ,
  pollAddC,
  pollPub,
  pollResp,
};
