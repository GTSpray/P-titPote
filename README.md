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

## About

**P'tit Pote** is a Discord bot for polls, reusable message aliases, and a few
utility commands. It is built with TypeScript, Express, Discord.js, MariaDB, and
MikroORM.

The documentation is split for two audiences:

| Audience | Goal | Where to look |
| --- | --- | --- |
| **Bot users** | Learn how to use slash commands on a server | [`docs/usage/`](docs/usage/) |
| **Developers** | Set up, run, test, and extend the bot | This README and [`docs/`](docs/) |

---

## Using the bot

These guides are for server members and moderators. They describe command
workflows, permissions, and expected bot behavior — not the codebase.

- [`docs/usage/poll/poll.md`](docs/usage/poll/poll.md) — create polls, vote, and view reports
- [`docs/usage/alias/alias.md`](docs/usage/alias/alias.md) — store and post reusable message aliases
- [`docs/usage/gimme/gimme.md`](docs/usage/gimme/gimme.md) — otter image, emoji gallery, and version

---

## Developing P'tit Pote

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v22 or newer)
- [Docker](https://www.docker.com/) or [Podman](https://podman.io/)
- A [Discord application](https://discord.com/developers/applications) (with bot + commands enabled)

### Quick start

#### 1. Clone and install

```bash
git clone https://github.com/GTSpray/P-titPote.git
cd P-titPote
npm install
```

#### 2. App credentials

Get your application credentials from the Discord Developer Portal:

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

#### 3. Discord scopes and permissions

Required scopes:

- `applications.commands`
- `bot` (with Send Messages enabled)

Required permissions:

- Manage Messages
- Send Messages
- Use external Emojis

For more details, see [Discord's getting started guide](https://docs.discord.com/developers/quick-start/getting-started).

### Local development (tunnel)

If developing locally, expose your dev environment to the internet so Discord
can reach the interactions endpoint. Two main tunnel options:

#### Using Localtunnel

> Set `LOCALTUNNEL_SUBDOMAIN` in your `.env` to reserve your subdomain (see [localtunnel status page](https://status.loca.lt/)).

For example, if you set `LOCALTUNNEL_SUBDOMAIN=my-bot`, you will get a URL like
`https://my-bot.loca.lt`.

Go to your Discord app **General Information** > **Interactions Endpoint URL**
and paste the tunnel URL with `/interactions` appended, e.g.:

```
https://my-bot.loca.lt/interactions
```

Click **Save Changes**.

#### Using ngrok

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

Copy your ngrok HTTPS forwarding URL and set it as your Interactions Endpoint as
above.

### Running the project

#### Production

```bash
make start      # Start the bot (prod)
make register   # Register slash commands
make stop       # Stop the bot
```

#### Development

```bash
make dev        # Run in dev container
make build      # Transpile TypeScript (dev mode)
make test       # Run test suite
make testw      # Run test suite in watch mode
```

> When developing, after running `make dev`, run `make install` inside the
> development container to install dev dependencies before running tests.

### Technical documentation

These guides describe architecture, services, and implementation details:

- [`docs/gateway.md`](docs/gateway.md) — Discord Gateway service lifecycle, events, and troubleshooting

Contributor conventions for agents and maintainers live in [`AGENTS.md`](AGENTS.md).

### Testing

All tests live in `tests/` and run with [Vitest](https://vitest.dev/).

```bash
make test   # run the full suite
make testw  # watch mode
```

When adding features or fixing bugs, add matching `.test.ts` files under
`tests/` and keep the suite green before proposing major changes.

### Project structure

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
├── docs/
│   ├── usage/                   # End-user command guides
│   └── gateway.md               # Gateway service technical guide
├── tests/                       # Vitest tests
├── docker/                      # Docker config/scripts
├── Makefile                     # Automation
├── docker-compose.yml           # Production Compose setup
├── docker-compose.dev.yml       # Dev Compose setup
├── package.json                 # Dependencies & scripts
└── tsconfig.json                # TypeScript config
```

#### Request flow

- `GET /health` returns an empty JSON response for service health checks.
- `POST /interactions` is the Discord interactions endpoint. It verifies
  Discord signatures with `PUBLIC_KEY` before dispatching anything.
- Slash commands are dispatched from `data.name` through
  `src/commands/slash/index.ts`.
- Buttons and modal submissions use a JSON `custom_id`, for example
  `{"t":"cta","d":{"a":"pollPub","pId":"..."}}`, and are dispatched through
  `src/commands/cta/index.ts`.
- Request IDs are added to `x-request-id` and included in structured logs.

Keep `express.json()` after the `/interactions` route. Discord signature
verification depends on the raw request body handled by `verifyKeyMiddleware`.

### Database management

Powered by [MikroORM Schema Generator](https://mikro-orm.io/docs/schema-generator):

```bash
make sh
# Inside the shell:
npx mikro-orm schema:create --dump   # Show SQL to create schema
npx mikro-orm schema:update --dump   # Show SQL for incremental update
npx mikro-orm schema:drop --dump     # Show SQL to drop schema
```

---

## Resources

- [Discord API Docs](https://discord.com/developers/docs/intro)
- [Discord Developers server (support)](https://discord.gg/discord-developers)
- [Community resources](https://discord.com/developers/docs/topics/community-resources)
- [Localtunnel](https://github.com/localtunnel/localtunnel)
- [MikroORM Documentation](https://mikro-orm.io/)
- [discord.js Documentation](https://discord.js.org/)

## License

MIT – see [LICENSE](LICENSE)
