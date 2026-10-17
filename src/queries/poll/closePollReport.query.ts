import * as z from 'zod';
import { parseCommand } from '../../errors/invalidCommand.js';

const ClosePollReportSchema = z.object({
  pollId: z.string().uuid(),
});

export class ClosePollReportQuery {
  guildId: string;
  pollId: string;

  constructor(payload: { guildId: string; pollId?: string }) {
    const parsed = parseCommand(ClosePollReportSchema, payload);
    this.guildId = payload.guildId;
    this.pollId = parsed.pollId;
  }
}
