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
      NGROK_AUTHTOKEN: "..."
    command: "http api:3000"
    build: !reset null
    ports:
      - "4040:4040"
    expose:
      - "4040"
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
