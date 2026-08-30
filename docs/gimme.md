# Gimme command workflow

The `/gimme` command provides lightweight utility responses that do not persist
state. It shares the slash-command dispatch path with the rest of the bot, and
its emoji subcommand makes bounded Discord REST and CDN calls.

## Intent

`/gimme` groups small public utilities:

| Subcommand | Purpose                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| `otter`    | Return the repository otter image as a media gallery.                     |
| `emoji`    | Find recent custom emojis in the current channel and display up to three. |
| `version`  | Return the running package version with a random emoji.                   |

The command has default member permission `Send Messages` and supports guild
install and user install contexts, including guild channels, private channels,
and bot DMs. There is no moderator gate.

## Dispatch and validation

`src/commands/slash/gimme/index.ts` declares the slash command and validates the
root interaction data with Zod before dispatching by subcommand name.

Invalid root payloads return `errors.invalidCommandPayload`. Unknown subcommands
return `errors.invalidSubcommand`. If a subcommand unexpectedly returns `null`,
the root handler responds with `errors.unmetResult`.

Subcommand handlers return Discord InteractionResponse payloads directly:

- `otter` returns Components V2 with `common.foundIt` and a media gallery item
  pointing at `assets/otter.png` on GitHub.
- `version` returns Components V2 text with `gimme.version.message`,
  `process.env.npm_package_version`, and `getRandomEmoji()`.
- `emoji` may call Discord REST and the Discord CDN before building its response.

## Emoji extraction flow

`/gimme emoji` is intentionally bounded:

1. Require `req.body.channel`; missing channel data returns HTTP 500 with
   `errors.invalid`.
2. Fetch the current channel's last `stealemoji_msgLimit` messages
   (`10`) through `GET /channels/{channel.id}/messages`.
3. Ignore messages whose content length is `>= stealemoji_msgSizeLimit` (`500`).
4. Extract only custom Discord emoji tokens matching `<:name:id>` or
   `<a:name:id>` with an 18- to 20-digit snowflake ID.
5. Keep the first `emojiLimitPrefetch` extracted candidates (`50`), deduplicate
   by emoji ID, then return at most `stealemoji_emojiLimit` emojis (`3`).
6. Resolve each selected emoji through `getEmojiUrl(id)`.

`getEmojiUrl` probes `https://cdn.discordapp.com/emojis/{id}.gif`. If the probe
succeeds, the media URL uses `.gif`; otherwise it falls back to `.png`.

No custom emoji produces the shared ephemeral `notFoundPayload()`. Found emojis
produce a public Components V2 response with `common.foundIt` and a media
gallery whose item descriptions use the extracted emoji names.

## Constraints and pitfalls

- `/gimme emoji` needs bot access to read message history in the current
  channel. Discord REST failures bubble up to the interaction handler today.
- Unicode emojis are not collected; only custom Discord emoji markup is parsed.
- Deduplication uses emoji ID, so different names pointing at the same custom
  emoji collapse to one gallery item.
- The extraction regex currently accepts letters, digits, spaces, and
  underscores in custom emoji names.
- The response uses public interaction messages except for the shared not-found
  case.

## Tests

The gimme test suite lives under `tests/src/commands/slashs/gimme/`:

- `gimme.spec.ts` covers command declaration, subcommand dispatch, and malformed
  root payloads.
- `otter.spec.ts` covers the media gallery response.
- `version.spec.ts` covers version rendering and the unknown fallback.
- `emoji.spec.ts` covers REST query limits, not-found responses, custom emoji
  token shapes, deduplication, response limits, long-message filtering, and
  media URL resolution.

The command tests exercise emoji extraction through the command path and assert
that selected IDs are passed to `getEmojiUrl`.
