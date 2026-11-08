# Testing and type-check workflow

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

## CI quality gate

`.github/workflows/qa.yml` runs on every push and can also be started manually
with `workflow_dispatch`. The job:

1. Copies `.env.sample` to `.env`.
2. Runs `make ci` to install dependencies, build TypeScript, and start the CI
   Compose stack.
3. Runs `make test`.
4. Runs `make lint`.
5. Builds the production Docker image once with `docker/ptitpote/Dockerfile`.

Keep local commands aligned with these Makefile targets so failures reproduce
the same path CI uses.

## Lint and TypeScript checks

The CI lint target combines formatting with a dedicated TypeScript check:

```bash
make lint    # Compose wrapper around npm run lint
npm run lint # prettier . --check && tsc -p tests/tsconfig.json --pretty
```

`tests/tsconfig.json` extends the root `tsconfig.json`, disables emit, and
includes the full `tests/` tree plus `global.d.ts`. Because specs import source
modules directly, this catches type errors across test code and the exercised
source paths.

Important compiler constraints from the root config:

- `strict` stays enabled for source and tests.
- `noUnusedLocals` rejects unused imports, locals, and helper values. Remove
  dead code instead of leaving unused placeholders.
- `noUnusedParameters` rejects unused parameters unless the signature needs
  them. Prefix intentionally unused parameters with `_`, as existing Express
  handlers and table-driven specs do.
- `verbatimModuleSyntax` requires type-only imports to use `import type` and
  keeps ESM import/export syntax explicit. Continue using `.js` extensions in
  relative source imports.
- `noImplicitReturns`, `noFallthroughCasesInSwitch`, and `noImplicitOverride`
  turn common control-flow mistakes into build failures.

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
- **`tsc` reports unused symbols:** remove the unused value, convert the import
  to `import type` when it is type-only, or underscore-prefix a required but
  intentionally unused parameter.
- **`tsc` reports that a type must be imported with a type-only import:** split
  mixed imports so values stay in a normal `import` and types move to
  `import type`.
