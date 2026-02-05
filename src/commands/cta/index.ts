import type { ModalHandlerDelcaration } from "../modals.js";
import { pollCreate } from "./poll/pollCreate.js";

export const cta: Record<string, ModalHandlerDelcaration<any>> = {
  pollCreate,
};
