import * as z from 'zod';

export enum GuildTriggerKind {
  WelcomeMessage = 'welcome_message',
  WelcomeRole = 'welcome_role',
}

/** All known kinds — use for DB `$in` filters and selects. */
export const GUILD_TRIGGER_KINDS = [
  GuildTriggerKind.WelcomeMessage,
  GuildTriggerKind.WelcomeRole,
] as const;

export const guildTriggerKindSchema = z.enum([
  GuildTriggerKind.WelcomeMessage,
  GuildTriggerKind.WelcomeRole,
]);
