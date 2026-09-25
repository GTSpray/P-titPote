import * as z from 'zod';
import { parseCommand } from '../../errors/invalidCommand.js';

const AppendPollQuestionSchema = z.object({
  pollId: z.string().uuid(),
  question: z.string().min(1).max(45),
  description: z.string().max(100).optional().nullable(),
});

export class AppendPollQuestionQuery {
  guildId: string;
  pollId: string;
  question: string;
  description: string | null;

  constructor(payload: {
    guildId: string;
    pollId?: string;
    question?: string;
    description?: string | null;
  }) {
    const parsed = parseCommand(AppendPollQuestionSchema, payload);
    this.guildId = payload.guildId;
    this.pollId = parsed.pollId;
    this.question = parsed.question;
    this.description = parsed.description ?? null;
  }
}
