# Trigger command workflow

The `/trigger` command lets moderators configure guild-scoped automations that
react to Discord gateway events. Today only `GuildMemberAdd` (member join) is
implemented, with welcome messages and welcome roles. All actions start from
one ephemeral message select (Discord forbids opening a modal from a modal
submit); execution runs on the matching Gateway event.

## Intent

A trigger fires when a Discord event occurs. Join kinds cover automatic
onboarding for now. Each row is named, typed (`welcome_message` or
`welcome_role`), and can be disabled without deleting. The command is a
configuration surface only; runtime delivery is owned by the Gateway process.

## Command shape

`src/commands/slash/trigger/index.ts` declares a single slash command (no
subcommands). The Discord builder allows guild, DM, private-channel, guild
install, and user-install contexts, but the handler immediately applies the
same moderator assertion as alias and poll. DM/user-install payloads do not have
the required guild member permissions and are rejected before state changes.

The slash handler replies with an ephemeral action menu:

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

| CTA action          | Handler                                                    |
| ------------------- | ---------------------------------------------------------- |
| `trigMenu`          | Action select → `UpdateMessage` with choice + next select  |
| `trigSetType`       | Create: kind select → open create config modal             |
| `trigCreateWelMsg`  | Create welcome message                                     |
| `trigUpdateWelMsg`  | Update welcome message (`n` = name; `enabled` unchanged)   |
| `trigPreviewWelMsg` | Preview welcome message (`n` = name in button `custom_id`) |
| `trigCreateWelRole` | Create welcome role                                        |
| `trigUpdateWelRole` | Update welcome role (`n` = name; `enabled` unchanged)      |
| `trigPick`          | Update modal, or apply enable / disable / delete           |

## Persistence

Tables:

- `guild_trigger` — `GuildTrigger`: name, kind, enabled; unique
  `(server, name, deletedAt)`.
- `trigger_message` — `TriggerMessage`: config (`channelId`, `message`);
  unique `trigger_id`.
- `trigger_role` — `TriggerRole`: config (`roleId`); unique `trigger_id`.

`TRIGGER_LIMIT = 10` non-deleted triggers per guild (disabled count). Create
never upserts; update only changes the matching kind's config and keeps the
same trigger name, kind, and enabled state. Delete is a soft delete
(`deletedAt`), so the historical row remains available to filtered-out queries
while the name can be reused.

Create handlers call `findOrCreateGuild(em, guildId)`, populate existing
triggers and configs, then enforce unique active names and `TRIGGER_LIMIT`
before persisting. Updates and lifecycle actions use `em.fork()` and always
query by `server.guildId` plus trigger name.

## Setup validation

Both create and update validate modal payloads with Zod before any Discord REST
probe or database write:

- name: `^[a-z0-9 _.-]+$`, 1-50 characters after trimming;
- welcome message: selected channel snowflake, message text 1-2000 characters;
- welcome role: selected role snowflake.

Welcome-message setup calls `assertBotCanPostInChannel(guildId, channelId)`.
That helper:

1. requires `APP_ID` because it fetches the bot's guild member record;
2. fetches the selected channel and rejects non-guild channels, channels from
   another guild, missing channels, and unsupported types;
3. supports text, announcement, voice, stage, public thread, private thread, and
   announcement thread channels;
4. fetches parent overwrites for threads when the parent is in the same guild;
5. fetches guild roles and the bot guild member, computes base and channel
   overwrites, then requires **View Channel** plus **Send Messages** (or
   **Send Messages in Threads** for thread targets).

Welcome-role setup calls `assertBotCanAssignRole(guildId, roleId)`. That helper
requires `APP_ID`, fetches guild roles and the bot member, rejects `@everyone`,
managed roles, unknown roles, missing **Manage Roles** / **Administrator**, and
target roles at or above the bot's highest role.

Known validation failures are converted to user-safe ephemeral messages. Other
REST or permission-check errors are logged and returned as generic unavailable
messages (`trigger.channel.unavailable` / `trigger.role.unavailable`).

## Runtime execution

`src/gateway/handlers.ts` listens for `GatewayDispatchEvents.GuildMemberAdd`,
forks an entity manager, and calls `src/gateway/runMemberJoinTrigger.ts`.
`runMemberJoinTrigger` loads enabled welcome-message and welcome-role triggers
for the guild, populated with their optional config rows.

When at least one enabled trigger exists, runtime fetches the guild name via
`GET /guilds/{guild.id}` for `{server}` interpolation. If that lookup fails, it
logs `trigger guild fetch failed` and falls back to the guild ID instead of
skipping all triggers.

Each loaded trigger then runs sequentially:

- `welcome_role` calls `PUT /guilds/{guild.id}/members/{user.id}/roles/{role.id}`;
- `welcome_message` interpolates `{user}`, `{username}`, and `{server}`, then
  calls `POST /channels/{channel.id}/messages`.

Per-trigger runtime failures are isolated. A failed role assignment or message
post logs `trigger execution failed` with guild, user, trigger ID, trigger name,
and kind, then the loop continues to the next enabled trigger. After the handler
returns, the gateway wrapper logs `gateway guild_member_add triggers done`; only
setup or top-level handler failures log `gateway guild_member_add triggers
failed`.

Requires `GatewayIntentBits.GuildMembers` in `GATEWAY_INTENTS`
(`src/gateway/identify.ts`; privileged intent must also be enabled in the
Discord Developer Portal).

Welcome-role assignment uses `PUT guildMemberRole`. Discord returns `50001`
Missing Access when the bot lacks **Manage Roles** or its highest role is not
above the target role. Create/update CTAs call
`assertBotCanAssignRole` before persisting so moderators get an ephemeral error
instead of a silent runtime failure. Human users also need **Manage Roles** (or
Administrator) to open the welcome-role create/update flow or re-enable a
welcome-role trigger.

Welcome-message posts use `POST channelMessages`. Discord returns `50001`
Missing Access when the bot cannot **View Channel** / **Send Messages** in the
target channel. Create/update CTAs call `assertBotCanPostInChannel` before
persisting for the same reason.

## Welcome message preview

After a successful create/update of a `welcome_message` trigger,
`trigCreateWelMsg` / `trigUpdateWelMsg` reply with a public confirmation that
includes a **Prévisualiser** button. The button `custom_id` carries the
trigger name (`trigPreviewWelMsg` + `n`).

Clicking it (moderators only) looks up the named active welcome-message trigger,
fetches the guild name with the same fallback as runtime, and posts an
interpolated public preview in the **same** channel as the button. The clicker
is used for `{user}` / `{username}`.

## Permissions

Same moderator gate as alias/poll: `assertInteractionUserIsModerator` on slash
and CTA handlers. It accepts members with Administrator, Manage Server, Manage
Channels, Manage Messages, Kick Members, or Ban Members. The slash command's
builder default permission is only `SendMessages`, so the server-side moderator
assertion is the real authorization boundary. Welcome-role create/update/enable
paths add `assertInteractionUserCanManageRoles` because those actions can grant
roles to future members.

## Limits and validation

- At most 10 non-deleted triggers per guild; disabled triggers count.
- Trigger names are unique per guild among non-deleted rows.
- Update modals do not rename triggers. The target name is carried in the CTA
  `custom_id`.
- Lifecycle actions that do not change state (`enable` on enabled, `disable` on
  disabled) update the ephemeral menu with the "already" message instead of
  posting a public confirmation.

## Troubleshooting

- Join triggers do not fire: confirm the gateway process is running, the bot is
  connected to the guild, and the privileged **Server Members Intent** is
  enabled in the Discord Developer Portal.
- Setup always returns a generic channel or role unavailable message: check
  `APP_ID`, `BOT_TOKEN`, and REST access. The validation helpers need to fetch
  the selected channel/role, all guild roles, and the bot's guild member record.
- Role trigger setup fails: make sure the target role is not managed, is not
  `@everyone`, and is below the bot's highest role. The bot needs **Manage
  Roles** or **Administrator**.
- Message trigger setup fails: make sure the selected channel belongs to the
  same guild and the bot has **View Channel** plus the relevant send permission.
  Thread targets require **Send Messages in Threads**.
- Runtime posts or role assignments fail after setup succeeds: inspect logs for
  `trigger execution failed`. Permissions can drift after configuration, but
  one failing trigger does not block the others.

## Tests

Trigger coverage is split by responsibility:

- `tests/src/commands/slashs/trigger/` covers the root command payload and
  moderator gating.
- `tests/src/cta/trigger/` covers create/update/select/preview/lifecycle flows,
  persistence, limit errors, and user-facing validation responses.
- `tests/src/gateway/runMemberJoinTrigger.spec.ts` covers enabled-only runtime
  execution and Discord REST calls.
- `tests/src/shared/trigger/` covers trigger-name validation and message
  interpolation.
- `tests/src/utils/assertBotCanPostInChannel.spec.ts` and
  `tests/src/utils/assertBotCanAssignRole.spec.ts` cover the Discord permission
  probes used before persisting configs.
