# Remind command workflow

The `/remind` command stores one idle-bump reminder per Discord thread and posts
a fixed bump message from an API-side hourly loop when the thread is quiet long
enough.

## Intent

Forgotten threads fall out of sight. `/remind` lets any member enable a
per-thread reminder with an inactivity threshold (`days`). The API process
groups active reminders by guild, verifies the bot is still on that guild, then
checks each thread’s last message age before bumping.

## Command shape

`src/commands/slash/remind/index.ts` declares the slash command and dispatches:

| Subcommand | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| `on`       | Persist a `ThreadRemind` for the current thread (`days` 1–30). |
| `status`   | Ephemeral status for the current thread.                       |
| `off`      | Soft-delete the reminder (owner or moderator).                 |

Contexts are guild-only. Handlers reject non-thread channels via
`isThreadChannel()` (`PublicThread`, `PrivateThread`, `AnnouncementThread`).

`on` reads `days` with `getOptionValue` and Zod (`REMIND_DAYS_MIN` /
`REMIND_DAYS_MAX`). Duplicate active reminders on the same `threadId` are
rejected.

## Permissions

- `on` / `status`: any member who can invoke the command (default Send Messages).
- `off`: `assertInteractionUserIsOwnerOrModerator` — creator `ownerUserId` or the
  same moderator bitmask as alias/poll.

## Persistence

- Entity `ThreadRemind`: `server`, `threadId`, `ownerUserId`, `idleDays`.
- Unique on `(threadId, deletedAt)` so one active reminder per thread.
- Soft-delete sets `deletedAt` (EntityBase filter).

## Hourly loop

`src/utils/remindLoop.ts`:

- `REMIND_INTERVAL_MS` = 1 hour.
- `startRemindLoop` runs an immediate tick then `setInterval` from `src/api.ts`.
- `runRemindTick(em)` (exported for tests):
  1. Load active `ThreadRemind` rows with `server`.
  2. Group by `guildId`.
  3. `GET Routes.userGuildMember(guildId)` — on 404 / unknown guild|member, soft-delete the whole batch.
  4. Else `GET` last message (`limit=1`); skip if younger than `idleDays`; soft-delete on missing channel; unarchive if needed; `POST` `remind.bump.message` (`⬆️`).

Errors are isolated per guild and per thread.

## Tests

- `tests/src/commands/slashs/remind/` — on / status / off / router.
- `tests/src/utils/remindLoop.spec.ts` — guild leave, idle skip, bump, unarchive, isolation.
- `tests/src/utils/remindConstants.spec.ts` — age helper.

## Troubleshooting

| Symptom                     | Likely cause                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| “ne marche que dans un fil” | Command run outside a thread.                                                                                            |
| “déjà un rappel”            | Active row for `threadId`; run `/remind off` first.                                                                      |
| No bumps                    | Threshold not reached; bot missing Manage Threads for archived threads; bot left guild (rows soft-deleted on next tick). |
| Off refused                 | Caller is neither owner nor moderator.                                                                                   |
