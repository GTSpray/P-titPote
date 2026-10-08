import * as z from 'zod';
import { parseCommand } from '../errors/invalidCommand.js';

const SetMessageAliasSchema = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
  message: z.string().min(1).max(500),
});

export class SetMessageAliasQuery {
  guildId: string;
  alias: string;
  message: string;

  constructor(payload: { guildId: string; alias?: string; message?: string }) {
    const parsed = parseCommand(SetMessageAliasSchema, payload);
    this.guildId = payload.guildId;
    this.alias = parsed.alias;
    this.message = parsed.message;
  }
}
