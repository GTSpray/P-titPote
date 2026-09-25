import * as z from 'zod';

const GetMessageAliasSchema = z.object({
  alias: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .min(1)
    .max(50),
});

export class GetMessageAliasQuery {
  guildId: string;
  alias: string;

  constructor(payload: { guildId: string; alias?: string }) {
    const parsed = GetMessageAliasSchema.parse(payload);
    this.guildId = payload.guildId;
    this.alias = parsed.alias;
  }
}
