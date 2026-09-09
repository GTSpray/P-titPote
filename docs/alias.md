# Alias command workflow

The `/alias` command lets moderators store reusable messages per Discord guild
and post them later from the same command family. It is a small command, but it
touches interaction validation, moderator permissions, and MikroORM persistence.

## Intent

Aliases are for repeated server messages such as announcements, welcome text, or
FAQ replies. Each alias is scoped to one guild so two servers can use the same
alias name with different message content.

## Command shape

`src/commands/slash/alias/index.ts` declares the slash command and dispatches the
subcommands:

| Subcommand | Purpose                                            |
| ---------- | -------------------------------------------------- |
| `set`      | Open a modal to create or update an alias message. |
| `say`      | Open a modal to post a stored alias message.       |
| `rm`       | Open a modal to soft-delete an alias.              |
| `ls`       | List active alias names for the current guild.     |

`set` takes no slash options and responds with `InteractionResponseType.Modal`
(text inputs). `say` and `rm` also take no slash options: they load active guild
aliases and open a modal with a `StringSelect` (`openAliasSelectModal`). Empty
lists return the shared ephemeral `notFoundPayload()`.

Modal submits are routed through the CTA registry in `src/commands/cta/index.ts`:

| CTA action | Handler                              |
| ---------- | ------------------------------------ |
| `aliasSet` | `src/commands/cta/alias/aliasSet.ts` |
| `aliasSay` | `src/commands/cta/alias/aliasSay.ts` |
| `aliasRm`  | `src/commands/cta/alias/aliasRm.ts`  |

The command is registered for guild install and user install contexts, including
guild channels, private channels, and bot DMs. The handler still requires a guild
member with moderator-like permissions before any subcommand runs, so DM and
user-install payloads cannot mutate or read alias data unless they include the
expected guild member permission data. CTA submit handlers re-check moderator
permissions.

The root handler validates the command payload with Zod before switching on the
subcommand name. Invalid root payloads return `errors.invalidCommandPayload`;
unknown subcommands return `errors.invalidSubcommand`.

`set` and `say` parse option values with `slashOptionsSchema` (name-keyed map,
then Zod). Option order in the Discord payload does not matter; missing required
options fail validation with `errors.invalidSubcommandPayload`.

## Permissions

`assertInteractionUserIsModerator(req.body)` gates all `/alias` subcommands and
alias CTA handlers. It accepts members with at least one of these Discord
permissions:

- Administrator;
- Manage Server;
- Manage Channels;
- Manage Messages;
- Kick Members;
- Ban Members.

Non-moderators receive the shared ephemeral `notAllowed()` response and the
subcommand or CTA handler logic is not applied.

## Persistence model

Alias state is stored in MariaDB through MikroORM:

- `DiscordGuild.guildId` identifies the Discord server.
- `MessageAliased.alias` stores the alias key.
- `MessageAliased.message` stores the message body.
- `MessageAliased.server` links each alias row to its guild.

`MessageAliased` has a uniqueness constraint on `server`, `alias`, and
`deletedAt`. Active aliases are therefore unique per guild while soft-deleted rows
can keep historical values. `/alias rm` soft-deletes by setting `deletedAt` to
the current time; it never hard-deletes rows. The default MikroORM
`excludeDeleted` filter hides soft-deleted aliases from `say`, `ls`, and later
`rm` lookups. After soft-delete, the same alias name can be created again with
`set`.

Each subcommand forks the ORM entity manager before reading or writing. Keep new
alias queries guild-scoped through `DiscordGuild.guildId` or
`MessageAliased.server.guildId`.

## Validation and responses

`aliasSet` validates:

- `alias`: lowercase ASCII letters and digits only (`/^[a-z0-9]+$/`), length
  `1..50`;
- `message`: length `1..500` (Paragraph text input in the modal).

When the guild row does not exist, `aliasSet` creates it and attaches the new
alias. When the alias already exists for that guild, `aliasSet` updates the
existing row instead of creating a duplicate. Creating a new alias is rejected
with ephemeral `errors.tooMany` when the guild already has 20 active aliases
active aliases; updates of an existing name still succeed. Success returns an
InteractionResponse with Components V2 and the shared `common.ok` text.

`aliasSay` and `aliasRm` read the selected value from the modal `StringSelect`
(`component.values[0]`), validate the same alias key shape, then look up one
active alias for the current guild.

`aliasSay`: a match is posted publicly as a Components V2 text display. A miss
returns an ephemeral `alias.say.notFound` response.

`aliasRm`: soft-deletes a matching active alias and returns `common.ok`. A miss
returns an ephemeral `alias.rm.notFound` response.

`/alias ls` reads active aliases for the guild ordered by alias name. It returns
only the names, not message bodies. Empty results use the shared ephemeral
`notFoundPayload()`.

## Operational notes

- The command depends on the API process database connection; if all alias
  subcommands fail after dispatch, check MariaDB connectivity and API startup
  migration logs.
- Slash commands are registered automatically when the API starts. Use
  `make register` to re-register manually without restarting the API.
- Aliases are public when posted with `/alias say`; avoid adding features that
  echo stored message bodies in list or error responses.
- Very large reusable announcements must fit the current 500-character
  validation limit.

## Tests

Slash openers live under `tests/src/commands/slashs/alias/`:

- `alias.spec.ts` covers command declaration, moderator gating, dispatch, and
  malformed root payloads.
- `set.spec.ts` covers modal response shape for create/update.
- `say.spec.ts` and `rm.spec.ts` cover select modal options and empty list.
- `ls.spec.ts` covers sorting, guild scoping, soft-delete filtering, and empty
  results.

CTA submit handlers live under `tests/src/cta/alias/`:

- `aliasSet.spec.ts` covers validation, guild creation, insert, update,
  duplicate prevention, and the 20-alias create limit.
- `aliasSay.spec.ts` covers guild-scoped lookup, not-found behavior, and
  validation.
- `aliasRm.spec.ts` covers soft-delete, not-found, guild scoping, and
  validation.

When changing alias persistence or validation, also run the database-oriented
checks from `docs/database.md` when Docker is available.
