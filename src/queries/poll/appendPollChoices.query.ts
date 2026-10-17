import * as z from 'zod';
import { parseCommand } from '../../errors/invalidCommand.js';

const AppendPollChoicesSchema = z.object({
  pollId: z.string().uuid(),
  choices: z.array(z.string().trim().min(1).max(100)).max(10),
});

export class AppendPollChoicesQuery {
  guildId: string;
  pollId: string;
  choices: string[];

  constructor(payload: {
    guildId: string;
    pollId?: string;
    choices?: string[];
  }) {
    const parsed = parseCommand(AppendPollChoicesSchema, payload);
    this.guildId = payload.guildId;
    this.pollId = parsed.pollId;
    this.choices = parsed.choices;
  }
}
