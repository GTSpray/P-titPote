<h1 align="center">
  <br>
  <a href="https://github.com/GTSpray/P-titPote"><img src="https://github.com/GTSpray/P-titPote/blob/main/assets/ptitpote.png?raw=true" width="150px" alt="P'tit Pote Discord Bot"></a>
  <br>
  P'tit Pote Discord Bot
  <br>
</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-≥22.x-green.svg"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/docker-ready-blue.svg"></a>
</p>

---

## 🌟 About

**P'tit Pote** is a modern Discord bot built with TypeScript, Express, and Discord.js.  
It features a robust, scalable architecture, database support via MariaDB with MikroORM, and strong logging via Winston.

## 🔧 Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v22 or newer)
- [Docker](https://www.docker.com/) or [Podman](https://podman.io/)
- A [Discord application](https://discord.com/developers/applications) (with bot + commands enabled)

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/GTSpray/P-titPote.git
cd P-titPote
npm install
```

### 2. App Credentials

Get your application credentials (from the Discord Developer Portal):

- **APP_ID**
- **BOT_TOKEN**
- **PUBLIC_KEY**

Copy `.env.sample` to `.env` and fill in your values:

```env
APP_ID=your_app_id
BOT_TOKEN=your_bot_token
PUBLIC_KEY=your_public_key
LOCALTUNNEL_SUBDOMAIN=your_subdomain # optional for development
```

### 3. Discord Scopes & Permissions

Required scopes:

- `applications.commands`
- `bot` (with Send Messages enabled)
  Required permissions:
- Manage Messages
- Send Messages
- Use external Emojis

_For more details, see [Discord's getting started guide](https://docs.discord.com/developers/quick-start/getting-started)._

## 🌐 Local Development (Tunnel)

If developing locally, you must expose your dev environment to the internet for Discord events to work. Two main tunnel options:

### Using Localtunnel

> 💡 Set `LOCALTUNNEL_SUBDOMAIN` in your `.env` to reserve your subdomain (see [localtunnel status page](https://status.loca.lt/)).

For exemple if you set: **LOCALTUNNEL_SUBDOMAIN**=_my-bot_

You will get a url like `https://my-bot.loca.lt`

Go to your Discord app "General Information" > **Interactions Endpoint URL**  
Paste the tunnel url with `/interactions` appended, e.g.:

```
https://my-bot.loca.lt/interactions
```

Click **Save Changes**.

### Using ngrok

Alternatively, update your `docker-compose.local.yml` for ngrok:

```yaml
services:
  localtunnel:
    image: ngrok/ngrok:alpine
    environment:
      NGROK_AUTHTOKEN: '...'
    command: 'http api:3000'
    build: !reset null
    ports:
      - '4040:4040'
    expose:
      - '4040'
```

- Copy your ngrok https forwarding URL and set it as your Interactions Endpoint as above.

## ⚙️ Usage

### Production

```bash
make start      # Start the bot (prod)
make register   # Register slash commands
make stop       # Stop the bot
```

### Development

```bash
make dev        # Run in dev container
make build      # Transpile TypeScript (dev mode)
make test       # Run test suite
make testw      # Run test suite in watch mode
```

> 💡 When developing, after running `make dev`, you should also execute `make install` inside the development container to install all dev dependencies before running the tests or starting development.

## 🗳 Poll Workflow

The `/poll create` command drives the poll lifecycle through Discord modals and
buttons.

### Moderator flow

1. Run `/poll create` in a server channel. The command opens a modal for:
   - poll title, 1-45 characters;
   - optional voter role (`Role des sondés`);
   - first question, 1-45 characters;
   - optional question description, up to 100 characters.
2. Use the ephemeral draft summary buttons to finish the poll:
   - **Ajouter des choix** adds choices to the latest question. The modal shows
     up to 4 inputs at a time, requires the first two choices, and each question
     can have at most 10 choices.
   - **Nouvelle question** adds another question. Draft polls can contain up to
     4 questions.
   - **Publier le sondage** posts the public voting message in the current
     channel and records the publication date.
3. After publication, the draft is immutable: adding questions, adding choices,
   or publishing again returns an ephemeral error.

Poll creation, draft updates, publication, and reports are moderator-only. The
moderator check accepts members with at least one of these Discord permissions:
Administrator, Manage Server, Manage Channels, Manage Messages, Kick Members,
or Ban Members.

### Voter flow

- Published polls show **Je vote!** and **Compte rendu** buttons.
- If the poll has a voter role, the published message pings that role and only
  members with the role can open or submit the vote modal.
- Questions with choices render as single-select fields. Questions without
  choices render as free-text answers, up to 400 characters.
- Existing answers are pre-filled, so submitting the vote modal again updates
  the member's previous answers for that poll.
- Voting is closed when `Poll.endDate` is set to a past or current time.

### Reports and closing

The **Compte rendu** button is moderator-only. When clicked, it:

- closes the poll immediately if it was still open by setting `Poll.endDate` to
  now;
- posts one or more public summary messages in the current channel;
- reports unique participant count, per-choice vote counts and rounded
  percentages, and chronological free-text answers;
- disables mentions in report messages and escapes `@` in free-text answers;
- splits reports over multiple Discord messages when the content exceeds the
  2,000 character message limit.

### Implementation map

- Slash command declaration and command payload validation:
  `src/commands/slash/poll/`.
- Poll component handlers: `src/commands/cta/poll/`.
- Poll persistence model: `Poll`, `PollStep`, `PollChoice`, and `PollResp` in
  `src/db/entities/`.
- Date formatting and closure checks: `src/utils/pollDates.ts`.
- Report chunking and mention escaping:
  `src/utils/splitStringIntoChunks.ts` and `src/utils/unMention.ts`.

## ✅ Testing

All tests for this project are located in the `tests/` directory.  
The test suite uses [Vitest](https://vitest.dev/) to ensure code quality and correct bot functionality.

### Running tests

To execute all tests:

```bash
make test
```

- This command will run all unit and integration tests found in the `tests/` directory.
- To run tests in watch mode (auto-reload on code changes):

```bash
make testw
```

### Guidelines

- When adding new features or fixing bugs, create corresponding test files in the `tests/` directory.
- Name your test files with the `.test.ts` suffix for consistency.
- Always make sure the test suite passes before proposing major changes.

## 🗂 Project Structure

```
P-titPote/
├── src/
│   ├── api.ts                   # Express server
│   ├── gateway.ts               # Discord WS gateway entrypoint
│   ├── register.ts              # Register commands
│   ├── logger.ts                # Winston logging setup
│   ├── mikro-orm.config.ts      # MikroORM/MariaDB config
│   ├── commands/                # Discord slash commands
│   ├── gateway/                 # WS handlers
│   ├── db/                      # Database entities
│   ├── utils/                   # Helper utils
│   └── migrations/              # Database migrations
├── tests/                       # Vitest tests
├── docker/                      # Docker config/scripts
├── Makefile                     # Automation
├── docker-compose.yml           # Production Compose setup
├── docker-compose.dev.yml       # Dev Compose setup
├── package.json                 # Dependencies & scripts
└── tsconfig.json                # TypeScript config
```

## Database Management

Powered by [MikroORM Schema Generator](https://mikro-orm.io/docs/schema-generator):

```bash
make sh
# Inside the shell:
npx mikro-orm schema:create --dump   # Show SQL to create schema
npx mikro-orm schema:update --dump   # Show SQL for incremental update
npx mikro-orm schema:drop --dump     # Show SQL to drop schema
```

## 📚 Resources

- [Discord API Docs](https://discord.com/developers/docs/intro)
- [Discord Developers server (support)](https://discord.gg/discord-developers)
- [Community resources](https://discord.com/developers/docs/topics/community-resources)
- [Localtunnel](https://github.com/localtunnel/localtunnel)
- [MikroORM Documentation](https://mikro-orm.io/)
- [discord.js Documentation](https://discord.js.org/)

## 📝 License

MIT – see [LICENSE](LICENSE)
