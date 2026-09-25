import * as z from 'zod';

const RemoveMessageAliasSchema = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
});

export class RemoveMessageAliasCommand {
  guildId: string;
  alias: string;

  constructor(payload: { guildId: string; alias?: string }) {
    const parsed = RemoveMessageAliasSchema.parse(payload);
    this.guildId = payload.guildId;
    this.alias = parsed.alias;
  }
}
