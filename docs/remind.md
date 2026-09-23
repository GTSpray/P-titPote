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

- Entity `ThreadRemind`: `server`, `threadId`, `ownerUserId`, `idleDays`,
  `nextTickAt`, optional `lastBumpMessageId`.
- Unique on `(threadId, deletedAt)` so one active reminder per thread.
- Index on `nextTickAt` for the hourly due query.
- Soft-delete sets `deletedAt` (EntityBase filter).
- `/remind on` sets `nextTickAt` to now so the next loop tick can evaluate it.

## Hourly loop

`src/utils/remindLoop.ts`:

- `REMIND_INTERVAL_MS` = 1 hour.
- `startRemindLoop` runs an immediate tick then `setInterval` from `src/api.ts`.
- `runRemindTick(em)` (exported for tests):
  1. Load due `ThreadRemind` rows (`nextTickAt <= now`) with `server`.
  2. Group by `guildId`.
  3. `GET Routes.guild(guildId)` — on 404 / unknown guild, soft-delete the whole batch
     (do not use `userGuildMember`: OAuth-only, bots get 20001).
  4. Per thread:
     - `GET` last message (`limit=1`); if still recent, try `DELETE` previous
       `lastBumpMessageId` (ignore 404), clear it, set
       `nextTickAt = lastMessageAt + idleDays` and return; soft-delete on missing channel.
     - When bumping: if the thread is archived, soft-delete and return (no
       unarchive). Otherwise try `DELETE` previous `lastBumpMessageId` (ignore
       404 if a mod already removed it), `POST` `remind.bump.message` (`⬆️`),
       store the new message id and set `nextTickAt = bumpAt + idleDays`.

Errors are isolated per guild and per thread.

## Tests

- `tests/src/commands/slashs/remind/` — on / status / off / router (including
  refuse archived on `/remind on`).
- `tests/src/utils/remindLoop.spec.ts` — guild leave, nextTick filter, idle
  reschedule, bump, previous bump delete, archived soft-delete, isolation.
- `tests/src/utils/remindConstants.spec.ts` — age helper.

## Troubleshooting

| Symptom                     | Likely cause                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| “ne marche que dans un fil” | Command run outside a thread.                                                               |
| “fil est archivé”           | `/remind on` on an archived thread, or loop soft-deleted after archive.                     |
| “déjà un rappel”            | Active row for `threadId`; run `/remind off` first.                                         |
| No bumps                    | Threshold not reached; thread archived (soft-deleted); bot left guild (batch soft-deleted). |
| Off refused                 | Caller is neither owner nor moderator.                                                      |
