# Testing workflow

P'tit Pote tests run with Vitest and exercise command handlers, CTA/modal
handlers, gateway sockets, shared utilities, and database services. The suite is
designed to run inside the Docker development/CI stack so it can use a dedicated
MariaDB database without touching local development data.

## How to run tests

From the repository root, prefer the Makefile targets:

```bash
make test   # one full Vitest run in the CI Compose stack
make testw  # Vitest watch mode in the development Compose stack
```

The underlying npm script is:

```bash
npm run test # vitest --config ./vitest.config.ts run
```

Use the npm script directly only when dependencies are installed locally and a
MariaDB server is reachable at the test config host (`dbtest`).

## Vitest configuration

`vitest.config.ts` is the entry point for the suite:

- `include: ['tests/**/*.spec.ts']` keeps test files under `tests/`.
- `setupFiles: ['tests/vitest.setup.ts']` installs shared mocks, custom
  matchers, and the cached test ORM before specs run.
- `globalSetup: ['tests/vitest.initdb.ts']` resets the test database schema once
  before the run.
- `DOTENV_CONFIG_QUIET=true` suppresses dotenv injection banners from modules
  that import `dotenv/config`. `docker-compose.ci.yml` sets the same variable
  for containerized CI runs.
- The CI reporter switches to `dot` plus `github-actions` when
  `GITHUB_ACTIONS` is set. The path mapper rewrites `/app/...` container paths
  to `${GITHUB_WORKSPACE}/...` so annotations point at repository files.

Tests run with Vitest globals enabled, so specs use `describe`, `it`, and
`expect` without importing them explicitly.

## Database isolation

Tests use a separate MariaDB service named `dbtest` from
`docker-compose.dev.yml`. The test connection lives in
`tests/mkro-orm-test.config.ts`:

| Setting  | Value                         |
| -------- | ----------------------------- |
| Database | `ptitpotetest`                |
| Host     | `dbtest`                      |
| User     | `ptitpotetest`                |
| Port     | `3306` inside the Compose net |

`tests/vitest.initdb.ts` calls the shared `initORM` helper with migrations
disabled, drops the test schema, recreates it with MikroORM's schema generator,
then closes the ORM. `tests/vitest.setup.ts` initializes the cached test ORM
again for the suite and closes it in `afterAll`.

Important constraints:

- The test schema is generated from current entities, not from migrations. A
  passing test suite does not prove migrations are valid; run `make db-check`
  after entity or migration changes.
- The app's development database service is separate from `dbtest`, so tests
  should not mutate local command state.
- Test ORM logging is silenced by a custom `DefaultLogger` subclass in
  `tests/mkro-orm-test.config.ts`.

## Shared test helpers

Use the existing fixtures before adding new test infrastructure:

- `tests/mocks/getInteractionHttpMock.ts` builds typed Express request/response
  mocks for slash commands and modal submissions. It fills realistic Discord
  interaction fields and accepts guild IDs, permissions, roles, and command data.
- `tests/mocks/discordjs.ts` replaces `discord.js` REST with
  `DiscrodRESTMock`. Register expected REST calls with a verb and full route;
  unregistered requests fail the test. The mock is cleared after every spec by
  `tests/vitest.setup.ts`.
- `tests/mocks/WebSocketMock.ts` replaces `ws` for gateway tests and exposes a
  mock server that can emit gateway messages, observe client sends, and simulate
  closes.
- `tests/customMatchers/customMatchers.ts` defines project-specific matchers
  such as `toMeetApiResponse`, `toBeWithin`, and `toBeDateCloseTo`. Their types
  are declared in `global.d.ts`.
- `tests/epectedEntities/` contains expected MikroORM entity shapes used by
  persistence assertions.

## Troubleshooting

- **`getaddrinfo ENOTFOUND dbtest` or connection refused:** run tests through
  `make test`/`make testw`, or ensure an equivalent MariaDB service is reachable
  at the host and credentials from `tests/mkro-orm-test.config.ts`.
- **Unexpected dotenv logs in test output:** confirm `DOTENV_CONFIG_QUIET=true`
  is present in the Vitest environment or CI Compose environment.
- **Discord REST mock throws `no existing result`:** register the expected route
  and verb with `DiscrodRESTMock.register(...)` before the code under test makes
  the REST call.
- **Database tests pass but migration checks fail:** update or add a migration
  under `src/migrations/`, rebuild compiled files, then run `make db-check`.
