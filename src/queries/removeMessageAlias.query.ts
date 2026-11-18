import * as z from 'zod';
import { parseCommand } from '../errors/invalidCommand.js';

const RemoveMessageAliasSchema = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
});

export class RemoveMessageAliasQuery {
  guildId: string;
  alias: string;

  constructor(payload: { guildId: string; alias?: string }) {
    const parsed = parseCommand(RemoveMessageAliasSchema, payload);
    this.guildId = payload.guildId;
    this.alias = parsed.alias;
  }
}
