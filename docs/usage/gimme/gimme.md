## 🖼 Gimme Workflow

The `/gimme` command returns images or bot metadata. Unlike `/alias` and
`/poll`, it has no moderator gate and is available to any member who can use
slash commands.

### Intent

`/gimme` provides lightweight utility responses: a fixed otter image, custom
emoji previews scraped from recent channel messages, and the running bot
version.

### Usage

#### `/gimme otter`

Posts a public media gallery with the repository otter image:

`https://github.com/GTSpray/P-titPote/raw/main/assets/otter.png`

#### `/gimme emoji`

Scans the current channel for custom Discord emojis and returns up to three of
them as a public media gallery.

Processing rules:

1. Fetch the 10 most recent messages in the channel via the Discord REST API.
2. Ignore messages whose content length is 500 characters or more.
3. Extract custom emoji tokens matching `<:name:id>` or `<a:name:id>` (18–20
   digit snowflake IDs). Unicode emoji are not collected.
4. Walk messages in API order, deduplicate by emoji ID, keep at most 50
   candidates, then return the first 3.
5. Resolve each emoji URL through `getEmojiUrl` (`.gif` when animated,
   otherwise `.png` on the Discord CDN).

When no qualifying emoji are found, the bot replies ephemerally with **Ahem...
j'ai rien trouvé... 🤷**. When emoji are found, the response includes **Voilà..
ce que j'ai trouvé** followed by the gallery.

#### `/gimme version`

Posts a public text message with a random emoji and the value of
`process.env.npm_package_version`, or `unknown` when that variable is unset.

### Constraints

- Requires a channel context; `/gimme emoji` returns HTTP 500 when
  `req.body.channel` is missing.
- `/gimme emoji` needs bot access to read channel message history.
- Default member permission is **Send Messages**. The command supports guild
  install, user install, guild channels, private channels, and bot DMs.
- Constants exported from the handler: `stealemoji_msgLimit = 10`,
  `stealemoji_msgSizeLimit = 500`, `stealemoji_emojiLimit = 3`.

### Examples

```text
/gimme otter
/gimme emoji
/gimme version
```

Typical `/gimme emoji` behavior in a channel where users recently posted custom
emotes:

```text
User A: gg <a:party:123456789012345678>
User B: +1 <a:party:123456789012345678> <a:fire:987654321098765432>
/gimme emoji
→ gallery with party and fire (duplicate party ID counted once)
```

### Implementation map

- Slash command declaration and subcommand dispatch:
  `src/commands/slash/gimme/index.ts`.
- Subcommand handlers: `src/commands/slash/gimme/otter.ts`, `emoji.ts`,
  `version.ts`.
- Emoji parsing: `src/utils/extractEmoji.ts`.
- Emoji URL resolution: `src/utils/getEmojiUrl.ts`.
- Discord REST client wrapper: `src/utils/discordapi.ts`.
- Random emoji helper for version output: `src/utils/getRandomEmoji.ts`.
