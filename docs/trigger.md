# Trigger command workflow

The `/trigger` command lets moderators configure guild-scoped join automations:
welcome messages and welcome roles. Kind is chosen via an ephemeral message
select (Discord forbids opening a modal from a modal submit); execution runs on
Discord Gateway `GuildMemberAdd`.

## Intent

Triggers are for automatic onboarding. Each row is named, typed
(`welcome_message` or `welcome_role`), and can be disabled without deleting.

## Command shape

`src/commands/slash/trigger/index.ts` declares the slash command and dispatches
subcommands:

| Subcommand | Purpose                                                    |
| ---------- | ---------------------------------------------------------- |
| `set`      | Ephemeral kind select, then CTA opens the config modal.    |
| `rm`       | Open a modal to enable, disable, or soft-delete a trigger. |

CTA registry:

| CTA action                 | Handler                                              |
| -------------------------- | ---------------------------------------------------- |
| `triggerSetType`           | Message select → open config modal (name + settings) |
| `triggerSetWelcomeMessage` | Upsert welcome message trigger                       |
| `triggerSetWelcomeRole`    | Upsert welcome role trigger                          |
| `triggerRm`                | Enable / disable (`enabled`) or soft-delete          |

## Persistence

Tables:

- `guild_trigger` — `GuildTrigger`: name, kind, enabled; unique `(server, name, deletedAt)`
- `trigger_message` — `TriggerMessage`: OneToOne config (`channelId`, `message`)
- `trigger_role` — `TriggerRole`: OneToOne config (`roleId`)

`TRIGGER_LIMIT = 10` non-deleted triggers per guild (disabled count). Upsert by
name sets `enabled = true`, swaps kind config (orphan-removes the unused child).

## Runtime execution

`src/gateway/runGuildTriggers.ts` loads enabled triggers for the guild on
`GuildMemberAdd`, assigns roles via `PUT guildMemberRole`, and posts messages
via `POST channelMessages` after interpolating `{user}`, `{username}`, and
`{server}`.

Requires `GatewayIntentBits.GuildMembers` in `ShardSocket` Identify (privileged
intent must also be enabled in the Discord Developer Portal).

## Permissions

Same moderator gate as alias/poll: `assertInteractionUserIsModerator` on slash
and CTA handlers.

## Limits and validation

- Name: `^[a-z0-9]+$`, 1–50
- Message: 1–2000 characters
- Max 10 non-deleted triggers per guild
