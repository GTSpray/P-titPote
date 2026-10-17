import * as z from 'zod';
import { parseCommand } from '../../errors/invalidCommand.js';

const GetPollStepSchema = z.object({
  stepId: z.string().uuid(),
});

export class GetPollStepQuery {
  guildId: string;
  stepId: string;

  constructor(payload: { guildId: string; stepId?: string }) {
    const parsed = parseCommand(GetPollStepSchema, payload);
    this.guildId = payload.guildId;
    this.stepId = parsed.stepId;
  }
}
