import * as z from 'zod';
import { parseCommand } from '../../errors/invalidCommand.js';

const GetPollSchema = z.object({
  pollId: z.string().uuid(),
});

export class GetPollQuery {
  guildId: string;
  pollId: string;

  constructor(payload: { guildId: string; pollId?: string }) {
    const parsed = parseCommand(GetPollSchema, payload);
    this.guildId = payload.guildId;
    this.pollId = parsed.pollId;
  }
}
