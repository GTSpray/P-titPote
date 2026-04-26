# AGENTS.md

Repository-wide instructions for AI coding agents working on **P'tit Pote**.

## Project summary

P'tit Pote is a Discord bot built with TypeScript, Express, Discord.js, MikroORM, MariaDB, Winston, Docker Compose, and Vitest. The codebase is ESM/NodeNext and targets Node.js 22+.

These instructions apply to the whole repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Agent operating rules

- Make small, focused changes that match the existing architecture.
- Prefer the Makefile targets documented below over ad-hoc shell commands, especially when Docker services are required.
- Do not commit generated output from `dist/`, `logs/`,`temp/`, local environment files, logs, database dumps, or temporary artifacts.
- Do not introduce new dependencies unless the task clearly requires them. Update `package-lock.json` whenever `package.json` dependencies change.
- Never commit secrets, Discord tokens, app IDs, public/private keys, local tunnel URLs, database passwords, or real `.env` values.
- Do not run commands that mutate external Discord state, such as slash-command registration, unless explicitly requested.
- When unsure about a behavior, inspect the existing implementation and tests first, then preserve compatibility.

## Environment

Required tools:

- Node.js `>=22.x`
- Docker Compose, or Docker/Podman according to the local setup
- A `.env` file created from `.env.sample` for real local runs

Common environment variables include:

- `APP_ID`
- `BOT_TOKEN`
- `PUBLIC_KEY`
- `LOCALTUNNEL_SUBDOMAIN` for local tunnel development, when needed

Use `.env.sample` as documentation only. Do not add real credentials to it.

## Common commands

Run these from the repository root.

```bash
# Install dependencies in the development container
make install

# Start development containers
make dev

# Build TypeScript
make build

# Run the test suite
make test

# Run tests in watch mode
make testw

# Check formatting
make lint

# Format the repository with Prettier
make pretty

# Open a shell in the app container
make sh
```

Production or externally mutating commands:

```bash
# Start production containers
make start

# Stop containers
make stop

# Register slash commands with Discord
make register
```

Only run `make register` when the user explicitly asks for slash commands to be registered, because it updates the Discord application configuration.

Useful npm scripts inside an already prepared Node environment:

```bash
npm run build
npm run test
npm run lint
npm run register
```

## Architecture map

Primary source files:

- `src/api.ts` - Express HTTP server and Discord interactions endpoint.
- `src/gateway.ts` - Discord gateway entrypoint.
- `src/register.ts` - slash-command registration entrypoint.
- `src/logger.ts` - Winston logging setup.
- `src/mikro-orm.config.ts` - MikroORM/MariaDB configuration.
- `src/commands/` - command types, shared command response helpers, and slash-command modules.
- `src/commands/slash/` - slash-command declarations and handlers.
- `src/db/` - database services and base entities.
- `src/db/entities/` - MikroORM entities.
- `src/migrations/` - database migrations.
- `src/gateway/` - gateway socket implementation and related types.
- `src/utils/` - shared utility functions.
- `tests/` - Vitest setup, fixtures, mocks, and tests.

When adding a slash command:

1. Add or update the command folder under `src/commands/slash/`.
2. Export the command declaration from the relevant `index.ts`.
3. Ensure the root `src/commands/slash/index.ts` includes it in `slashcommands`.
4. Add tests under the matching `tests/src/commands/` area when practical.
5. Build and test before proposing the change.
6. Do not run `make register` unless explicitly asked.

## TypeScript and module conventions

- Keep TypeScript strict-compatible.
- This project uses ESM with `module` and `moduleResolution` set to `nodenext`.
- Use explicit `.js` extensions in relative imports from TypeScript files, matching the existing code style.
- Prefer named exports for command handlers, helpers, and utilities.
- Keep command handlers async and return Express responses consistently.
- Avoid large files with mixed responsibilities. Put reusable logic in `src/utils/` or a focused module near the feature.
- Prefer type-only imports (`import type`) when an import is only used for typing.
- Validate untrusted Discord interaction payloads with Zod or similarly explicit checks before using them.
- Keep public-facing Discord messages short and friendly. Existing bot copy is mostly French, so new user-facing strings should usually be French too.

## Express and Discord interaction rules

- Preserve Discord request verification on `/interactions`.
- Do not move `express.json()` before the interactions route unless verification is intentionally reworked and tested. Discord interaction verification depends on receiving the request body in the expected form.
- Preserve request ID propagation and structured logging where possible.
- Log through `logger` instead of `console`.
- Avoid logging secrets, tokens, raw authorization headers, or full user payloads unless strictly necessary and redacted.

## Database rules

- Use MikroORM entities and migrations consistently.
- When changing entity shape, add or update migrations as needed.
- Prefer non-destructive migrations. Any destructive schema operation must be called out clearly.
- Use `em.fork()` where the existing code does so for request/handler-scoped work.
- Build before running MikroORM commands that depend on compiled files.
- Useful schema/migration checks inside the container include:

```bash
npx mikro-orm migration:check
npx mikro-orm schema:update --dump
npx mikro-orm schema:create --dump
```

## Testing rules

- Tests use Vitest.
- Add or update tests for new commands, command parsing, utilities, gateway behavior, and database logic.
- Test files should use the `.test.ts` suffix.
- Prefer tests under `tests/src/` that mirror the source area being changed.
- Use existing mocks, setup files, and custom matchers before introducing new test infrastructure.
- Before finishing a non-trivial change, run:

```bash
make build
make test
make lint
```

When Docker is unavailable, use the closest local npm equivalents and state what could not be run.

## Formatting and style

- Prettier is the formatting authority.
- Do not hand-format large diffs. Run `make pretty` when formatting is needed.
- Keep diffs minimal and avoid unrelated cleanup.
- Preserve existing naming even if typos exist in current public APIs or file paths, unless the task is specifically to rename them.
- Do not change `.prettierrc`, `tsconfig.json`, Docker Compose files, or CI config unless required by the task.

## GitHub Actions and CI

- Check `.github/workflows/` before modifying CI behavior.
- Keep CI commands aligned with the Makefile targets.
- Do not disable tests, formatting checks, dependency checks, or database checks to make a change pass.
- If a test is flaky or environment-dependent, document the reason instead of weakening the assertion.

## Security and safety

- Treat all Discord interaction data, message content, and guild/user IDs as untrusted input.
- Validate inputs and enforce length limits for stored or displayed content.
- Avoid broad permissions when adding Discord commands.
- Do not expose internal errors to Discord users; use concise user-safe error messages and log details server-side.
- Keep network calls bounded and defensive. Avoid unbounded message fetching or database scans.
- Do not add telemetry or external services without explicit approval.

## Pull request checklist for agents

Before proposing a change, verify:

- The implementation matches the existing command and module patterns.
- New or changed behavior has tests where practical.
- `make build` passes, or an equivalent local build was attempted.
- `make test` passes, or failures are explained.
- `make lint` passes, or formatting changes are provided.
- No secrets or local-only files are included.
- No external Discord state was changed unless explicitly requested.
- Any database migration impact is documented.

## Response expectations

When reporting back to a maintainer:

- Summarize the intent and the files changed.
- Mention the exact commands run and their results.
- Call out any commands that could not be run.
- Highlight risky areas such as Discord registration, database migrations, permissions, or environment variables.
