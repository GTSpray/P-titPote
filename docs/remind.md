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

`src/commands/slash/remind/index.ts` declares `/remind` with no options. In a
thread it replies with an ephemeral string select (`remindMenu`). Outside a
thread it replies with `remind.on.notThread`.

| Action   | Handler          | Purpose                                                                                                                    |
| -------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `on`     | modal `remindOn` | Persist a `ThreadRemind` (`days` 1–30). Archived threads and duplicates are refused before the modal, and again on submit. |
| `status` | `remindMenu`     | Replace the menu with the current thread status.                                                                           |
| `off`    | `remindMenu`     | Soft-delete the reminder (owner or moderator) and delete the last bump message if any.                                     |

Component replies use `UpdateMessage`, so the ephemeral menu is replaced in
place. The day count is a short text field parsed with Zod (`REMIND_DAYS_MIN` /
`REMIND_DAYS_MAX`). Unreadable or out-of-range input returns `remind.days.invalid`.
Duplicate active reminders on the same `threadId` are rejected.

Contexts are guild-only. Thread checks use `isThreadChannel()` (`PublicThread`,
`PrivateThread`, `AnnouncementThread`).

## Permissions

- Menu, **Activer**, and **Statut**: any member who can invoke the command
  (default Send Messages).
- **Désactiver**: `assertInteractionUserIsOwnerOrModerator` — creator
  `ownerUserId` or the same moderator bitmask as alias/poll.

## Persistence

- Entity `ThreadRemind`: `server`, `threadId`, `ownerUserId`, `idleDays`,
  `nextTickAt`, optional `lastBumpMessageId`.
- Unique on `(threadId, deletedAt)` so one active reminder per thread.
- Index on `nextTickAt` for the hourly due query.
- Soft-delete sets `deletedAt` (EntityBase filter).
- Submitting **Activer** sets `nextTickAt` to now so the next loop tick can evaluate it.

## Hourly loop

`src/shared/remind/remindLoop.ts`:

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
     - When bumping: if the thread is archived, try `DELETE` previous
       `lastBumpMessageId` (ignore 404), soft-delete and return (no unarchive).
       Otherwise try `DELETE` previous `lastBumpMessageId` (ignore 404 if a mod
       already removed it), `POST` `remind.bump.message` (`⬆️`), store the new
       message id and set `nextTickAt = bumpAt + idleDays`.
     - Soft-delete paths that still have Discord access (empty thread, archived)
       also remove the last bump before clearing the row. Guild-leave batch
       soft-delete does not call Discord message APIs.

Errors are isolated per guild and per thread.

## Tests

- `tests/src/commands/slashs/remind/` — menu and refusal outside a thread.
- `tests/src/cta/remind/` — activate (modal), status, and off, including archived refusal.
- `tests/src/shared/remind/remindLoop.spec.ts` — guild leave, nextTick filter,
  idle reschedule, bump, previous bump delete, archived soft-delete, isolation.
- `tests/src/shared/remind/` — `isOlderThanIdleDays`, `computeNextTickAt`.

## Troubleshooting

| Symptom                     | Likely cause                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| “ne marche que dans un fil” | Command run outside a thread.                                                               |
| “fil est archivé”           | **Activer** on an archived thread, or loop soft-deleted after archive.                      |
| “déjà un rappel”            | Active row for `threadId`; choose **Désactiver** first.                                     |
| No bumps                    | Threshold not reached; thread archived (soft-deleted); bot left guild (batch soft-deleted). |
| Off refused                 | Caller is neither owner nor moderator.                                                      |
