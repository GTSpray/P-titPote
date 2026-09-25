import * as z from 'zod';
import { parseCommand } from '../../errors/invalidCommand.js';

const PublishPollSchema = z.object({
  pollId: z.string().uuid(),
});

export class PublishPollQuery {
  guildId: string;
  pollId: string;

  constructor(payload: { guildId: string; pollId?: string }) {
    const parsed = parseCommand(PublishPollSchema, payload);
    this.guildId = payload.guildId;
    this.pollId = parsed.pollId;
  }
}
