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

| Subcommand | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| `set`      | Create a new alias or update an existing alias message. |
| `say`      | Post a stored alias message in the interaction channel. |
| `ls`       | List active alias names for the current guild.          |

The command is registered for guild install and user install contexts, including
guild channels, private channels, and bot DMs. The handler still requires a guild
member with moderator-like permissions before any subcommand runs, so DM and
user-install payloads cannot mutate or read alias data unless they include the
expected guild member permission data.

The root handler validates the command payload with Zod before switching on the
subcommand name. Invalid root payloads return `errors.invalidCommandPayload`;
unknown subcommands return `errors.invalidSubcommand`.

## Permissions

`assertInteractionUserIsModerator(req.body)` gates all `/alias` subcommands. It
accepts members with at least one of these Discord permissions:

- Administrator;
- Manage Server;
- Manage Channels;
- Manage Messages;
- Kick Members;
- Ban Members.

Non-moderators receive the shared ephemeral `notAllowed()` response and the
subcommand handler is not called.

## Persistence model

Alias state is stored in MariaDB through MikroORM:

- `DiscordGuild.guildId` identifies the Discord server.
- `MessageAliased.alias` stores the alias key.
- `MessageAliased.message` stores the message body.
- `MessageAliased.server` links each alias row to its guild.

`MessageAliased` has a uniqueness constraint on `server`, `alias`, and
`deletedAt`. Active aliases are therefore unique per guild while soft-deleted rows
can keep historical values.

Each subcommand forks the ORM entity manager before reading or writing. Keep new
alias queries guild-scoped through `DiscordGuild.guildId` or
`MessageAliased.server.guildId`.

## Validation and responses

`/alias set` validates:

- `alias`: lowercase ASCII letters and digits only (`/^[a-z0-9]+$/`), length
  `1..50`;
- `message`: length `1..500`.

When the guild row does not exist, `set` creates it and attaches the new alias.
When the alias already exists for that guild, `set` updates the existing row
instead of creating a duplicate. Success returns an InteractionResponse with
Components V2 and the shared `common.ok` text.

`/alias say` validates the same alias key shape, then looks up one active alias
for the current guild. A match is posted publicly as a Components V2 text
display. A miss returns an ephemeral `alias.say.notFound` response.

`/alias ls` reads active aliases for the guild ordered by alias name. It returns
only the names, not message bodies. Empty results use the shared ephemeral
`notFoundPayload()`.

## Operational notes

- The command depends on the API process database connection; if all alias
  subcommands fail after dispatch, check MariaDB connectivity and API startup
  migration logs.
- Discord registration is not automatic after code changes. Run `make register`
  only when intentionally updating Discord application commands.
- Aliases are public when posted with `/alias say`; avoid adding features that
  echo stored message bodies in list or error responses.
- Very large reusable announcements must fit the current 500-character
  validation limit.

## Tests

The alias test suite lives under `tests/src/commands/slashs/alias/`:

- `alias.spec.ts` covers command declaration, moderator gating, dispatch, and
  malformed root payloads.
- `set.spec.ts` covers validation, guild creation, insert, update, and duplicate
  prevention.
- `say.spec.ts` covers guild-scoped lookup, not-found behavior, and validation.
- `ls.spec.ts` covers sorting, guild scoping, soft-delete filtering, and empty
  results.

When changing alias persistence or validation, also run the database-oriented
checks from `docs/database.md` when Docker is available.
