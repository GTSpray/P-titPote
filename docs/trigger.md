# Trigger command workflow

The `/trigger` command lets moderators configure guild-scoped join automations:
welcome messages and welcome roles. All actions start from one ephemeral
message select (Discord forbids opening a modal from a modal submit); execution
runs on Discord Gateway `GuildMemberAdd`.

## Intent

Triggers are for automatic onboarding. Each row is named, typed
(`welcome_message` or `welcome_role`), and can be disabled without deleting.

## Command shape

`src/commands/slash/trigger/index.ts` declares a single slash command (no
subcommands). The handler replies with an ephemeral action menu.

| Action  | Flow                                                                 |
| ------- | -------------------------------------------------------------------- |
| create  | Ephemeral kind select → config modal (name + settings); insert only. |
| update  | Ephemeral trigger select → config modal (name fixed in custom_id).   |
| enable  | Ephemeral trigger select → set `enabled = true`.                     |
| disable | Ephemeral trigger select → set `enabled = false`.                    |
| delete  | Ephemeral trigger select → soft-delete.                              |

CTA registry:

| CTA action                 | Handler                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `triggerMenu`              | Action select → next ephemeral step                             |
| `triggerSetType`           | Create: kind select → open create config modal                  |
| `triggerSetWelcomeMessage` | Create welcome message trigger (fails if name exists)           |
| `triggerSetWelcomeRole`    | Create welcome role trigger (fails if name exists)              |
| `triggerPick`              | Update modal, or apply enable / disable / delete                |
| `tUpdMsg`                  | Update welcome message config (`n` = name; `enabled` unchanged) |
| `tUpdRole`                 | Update welcome role config (`n` = name; `enabled` unchanged)    |

`tUpdMsg` / `tUpdRole` are short aliases (Discord `custom_id` ≤ 100 chars) that
reuse the welcome message / role handlers.

## Persistence

Tables:

- `guild_trigger` — `GuildTrigger`: name, kind, enabled; unique `(server, name, deletedAt)`
- `trigger_message` — `TriggerMessage`: config (`channelId`, `message`); unique `trigger_id`
- `trigger_role` — `TriggerRole`: config (`roleId`); unique `trigger_id`

`TRIGGER_LIMIT = 10` non-deleted triggers per guild (disabled count). Create
never upserts; update only changes the matching kind’s config.

## Runtime execution

`src/gateway/runGuildTriggers.ts` loads enabled triggers for the guild on
`GuildMemberAdd`, assigns roles via `PUT guildMemberRole`, and posts messages
via `POST channelMessages` after interpolating `{user}`, `{username}`, and
`{server}`.

Requires `GatewayIntentBits.GuildMembers` in `ShardSocket` Identify (privileged
intent must also be enabled in the Discord Developer Portal).

Welcome-role assignment uses `PUT guildMemberRole`. Discord returns `50001`
Missing Access when the bot lacks **Manage Roles** or its highest role is not
above the target role. Create/update CTAs call
`assertBotCanAssignRole` before persisting so moderators get an ephemeral error
instead of a silent runtime failure.

## Permissions

Same moderator gate as alias/poll: `assertInteractionUserIsModerator` on slash
and CTA handlers.

## Limits and validation

- Name: `^[a-z0-9 _.-]+$`, 1–50 (trimmed)
- Message: 1–2000 characters
- Max 10 non-deleted triggers per guild
