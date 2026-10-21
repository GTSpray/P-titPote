# Trigger command workflow

The `/trigger` command lets moderators configure guild-scoped automations that
react to Discord gateway events. Today only `GuildMemberAdd` (member join) is
implemented, with welcome messages and welcome roles. All actions start from
one ephemeral message select (Discord forbids opening a modal from a modal
submit); execution runs on the matching Gateway event.

## Intent

A trigger fires when a Discord event occurs. Join kinds cover automatic
onboarding for now. Each row is named, typed (`welcome_message` or
`welcome_role`), and can be disabled without deleting.

## Command shape

`src/commands/slash/trigger/index.ts` declares a single slash command (no
subcommands). The handler replies with an ephemeral action menu.

| Action  | Flow                                                               |
| ------- | ------------------------------------------------------------------ |
| create  | `UpdateMessage` kind select → config modal (name + settings).      |
| update  | `UpdateMessage` trigger select → config modal (name in custom_id). |
| enable  | Trigger select → public confirmation; dismiss ephemeral menu.      |
| disable | Trigger select → public confirmation; dismiss ephemeral menu.      |
| delete  | Trigger select → public confirmation; dismiss ephemeral menu.      |

Action / trigger picks use `UpdateMessage` so the ephemeral menu updates in
place. Enable / disable / delete success replies with a **public**
`ChannelMessageWithSource` (Components V2) and deletes the ephemeral select
via the interaction webhook. Opening a **Modal** cannot update the message in
the same ack, so the kind / update trigger select stays while the modal is
open.

CTA registry:

| CTA action          | Handler                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `trigMenu`          | Action select → `UpdateMessage` with choice + next select                   |
| `trigSetType`       | Create: kind select → open create config modal                              |
| `trigSetWelMsg`     | Create / update welcome message (`n` = name on update; `enabled` unchanged) |
| `trigPreviewWelMsg` | Preview welcome message (`n` = name in button `custom_id`)                  |
| `trigSetWelRole`    | Create / update welcome role (`n` = name on update; `enabled` unchanged)    |
| `trigPick`          | Update modal, or apply enable / disable / delete                            |

Create vs update for welcome handlers is distinguished by the presence of `n`
in the CTA payload (no separate action aliases).

## Persistence

Tables:

- `guild_trigger` — `GuildTrigger`: name, kind, enabled; unique `(server, name, deletedAt)`
- `trigger_message` — `TriggerMessage`: config (`channelId`, `message`); unique `trigger_id`
- `trigger_role` — `TriggerRole`: config (`roleId`); unique `trigger_id`

`TRIGGER_LIMIT = 10` non-deleted triggers per guild (disabled count). Create
never upserts; update only changes the matching kind’s config.

## Runtime execution

`src/gateway/runMemberJoinTrigger.ts` loads enabled triggers for the guild on
`GuildMemberAdd`, assigns roles via `PUT guildMemberRole`, and posts messages
via `POST channelMessages` after interpolating `{user}`, `{username}`, and
`{server}`.

Requires `GatewayIntentBits.GuildMembers` in `GATEWAY_INTENTS`
(`src/gateway/identify.ts`; privileged intent must also be enabled in the
Discord Developer Portal).

Welcome-role assignment uses `PUT guildMemberRole`. Discord returns `50001`
Missing Access when the bot lacks **Manage Roles** or its highest role is not
above the target role. Create/update CTAs call
`assertBotCanAssignRole` before persisting so moderators get an ephemeral error
instead of a silent runtime failure.

Welcome-message posts use `POST channelMessages`. Discord returns `50001`
Missing Access when the bot cannot **View Channel** / **Send Messages** in the
target channel. Create/update CTAs call `assertBotCanPostInChannel` before
persisting for the same reason.

## Welcome message preview

After a successful create/update of a `welcome_message` trigger,
`trigSetWelMsg` replies with a public confirmation that includes a
**Prévisualiser** button. The button `custom_id` carries the trigger name
(`trigPreviewWelMsg` + `n`).

Clicking it (moderators only) posts an interpolated preview in the **same**
channel, with the clicker as `{user}` / `{username}` — same substitution as
join-time execution.

## Permissions

Same moderator gate as alias/poll: `assertInteractionUserIsModerator` on slash
and CTA handlers.

## Limits and validation

- Name: `^[a-z0-9 _.-]+$`, 1–50 (trimmed)
- Message: 1–2000 characters
- Max 10 non-deleted triggers per guild
