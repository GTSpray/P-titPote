import * as z from 'zod';
import { parseCommand } from '../../errors/invalidCommand.js';

const CreatePollSchema = z.object({
  title: z.string().min(1).max(45),
  question: z.string().min(1).max(45),
  description: z.string().max(100).optional().nullable(),
  role: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export class CreatePollQuery {
  guildId: string;
  title: string;
  question: string;
  description: string | null;
  role: string | null;

  constructor(payload: {
    guildId: string;
    title?: string;
    question?: string;
    description?: string | null;
    role?: string | null;
  }) {
    const parsed = parseCommand(CreatePollSchema, payload);
    this.guildId = payload.guildId;
    this.title = parsed.title;
    this.question = parsed.question;
    this.description = parsed.description ?? null;
    this.role = parsed.role ?? null;
  }
}
