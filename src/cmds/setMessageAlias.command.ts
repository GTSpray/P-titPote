import * as z from 'zod';

const SetMessageAliasSchema = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
  message: z.string().min(1).max(500),
});

export class SetMessageAliasCommand {
  guildId: string;
  alias: string;
  message: string;

  constructor(payload: { guildId: string; alias?: string; message?: string }) {
    const parsed = SetMessageAliasSchema.parse(payload);
    this.guildId = payload.guildId;
    this.alias = parsed.alias;
    this.message = parsed.message;
  }
}
