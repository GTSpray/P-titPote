# Poll technical workflow

The poll subsystem is a multi-step Discord interaction workflow backed by
MikroORM entities. It starts from `/poll create`, continues through modal and
button component handlers, and ends when a moderator publishes a public voting
message or posts a report.

## Intent

- Let moderators build a poll without leaving Discord.
- Store draft and published poll state per guild.
- Let members vote once per question, with later submissions updating their
  previous answers.
- Produce a public report that is safe to post in busy channels.

## Entry points

| Interaction | Handler | Purpose |
| --- | --- | --- |
| `/poll create` | `src/commands/slash/poll/create.ts` | Opens the first poll creation modal. |
| `pollCreate` modal | `src/commands/cta/poll/pollCreate.ts` | Creates the draft poll, then appends questions or choices. |
| `pollAddQ` button | `src/commands/cta/poll/pollAddQ.ts` | Opens a modal for the next question. |
| `pollAddC` button | `src/commands/cta/poll/pollAddC.ts` | Opens a modal for choices on the latest question. |
| `pollPub` button | `src/commands/cta/poll/pollPub.ts` | Publishes the public voting message. |
| `pollResp` button | `src/commands/cta/poll/pollResp.ts` | Opens the voting modal for a member. |
| `pollVote` modal | `src/commands/cta/poll/pollVote.ts` | Stores or updates the member's answers. |
| `pollSummary` button | `src/commands/cta/poll/pollSummary.ts` | Posts the public report and closes the poll on success. |

Component routing uses JSON `custom_id` values with the shape
`{"t":"cta","d":{"a":"pollCreate","pId":"..."}}`. The HTTP interactions
endpoint parses the action name at `d.a` and dispatches through
`src/commands/cta/index.ts`.

## Data model

- `DiscordGuild` owns all poll records for one Discord guild.
- `Poll` stores the title, optional voter role, `publicationDate`, `endDate`,
  and ordered `steps`.
- `PollStep` stores a question, optional description, order, and ordered
  `choices`.
- `PollChoice` stores one selectable choice. Choice order is unique within a
  step.
- `PollResp` stores one member's answer for one step. Choice questions set
  `pollChoice`; free-text questions set `content`.

Handlers use `em.fork()` for request-scoped database work and always scope poll
lookups by `guild_id` so a component from one guild cannot operate on another
guild's poll.

## Draft lifecycle

1. `/poll create` validates the slash payload and requires moderator
   permissions.
2. The first `pollCreate` modal submission creates a `DiscordGuild` if needed,
   then creates the `Poll` and its first `PollStep`.
3. The ephemeral draft summary contains buttons to add choices, add another
   question, or publish the poll.
4. Adding a question reuses `pollCreate` with the poll ID in `custom_id`.
5. Adding choices stores non-empty choice inputs on the latest question.
6. Once `publicationDate` is set, draft mutation handlers return the shared
   "do not update published poll" response.

Limits enforced by the modals and handlers:

- title: 1-45 characters;
- question: 1-45 characters;
- question description: up to 100 characters;
- choices: up to 10 per question, shown 4 inputs at a time;
- questions: up to 4 per poll;
- free-text vote answer: up to 400 characters.

## Voting lifecycle

`pollPub` sets `publicationDate`, persists it, and returns the public poll
message with two buttons: **Je vote!** and **Compte rendu**. If the poll has a
role, the published message mentions that role and `pollResp`/`pollVote` require
the voting member to have it.

Voting is closed when `isPollClosed(endDate)` returns true, meaning `endDate` is
set and is less than or equal to the current time. A member can reopen the vote
modal before closure; existing `PollResp` rows are loaded and used as defaults,
so submitting again updates the previous answers.

Choice questions render as string selects. Questions without choices render as
paragraph text inputs.

## Reports and closing behavior

The **Compte rendu** button is moderator-only. `pollSummary`:

1. loads the poll, steps, choices, and all responses;
2. sets `endDate` to now only when the poll is still open;
3. builds report markdown with participant counts, choice totals and rounded
   percentages, chronological free-text answers, and the closing timestamp;
4. splits the report into messages under Discord's 2,000 character limit;
5. posts every chunk to the current channel with `allowed_mentions: { parse: [] }`;
6. flushes the updated `endDate` only after all report messages are posted.

This ordering is intentional: if Discord rejects report publication, the handler
returns the translated failure message and the poll remains open. This prevents
a failed report attempt from silently closing voting.

Free-text answers are passed through `unMention`, which inserts a zero-width
space after every `@`, before reports are posted.

## Operational notes

- Polls are effectively guild-only. Persistence and CTA handlers require
  `guild_id`; do not treat DM or user-install contexts as supported for the poll
  workflow.
- Report publication requires the bot to send messages in the channel where the
  report button is clicked.
- Role-restricted polls depend on Discord sending member roles in the
  interaction payload.
- Debug unknown component routing by checking the JSON `custom_id`, the `d.a`
  action name, and the `cta` registry.
- If users can run slash commands but poll buttons fail, check the `api`
  container logs for `/interactions` errors and confirm the database is reachable.

## Tests

Relevant tests live under `tests/src/commands/slashs/poll/` and
`tests/src/cta/poll/`. The report failure guarantee is covered in
`tests/src/cta/poll/pollSummary.spec.ts` by asserting that `endDate` is not
persisted when Discord report posting fails.
