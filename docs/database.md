# Database and migration workflow

P'tit Pote stores guild-scoped command state in MariaDB through MikroORM. The
database is used by the alias command family and the poll workflow; the gateway
service depends on the database container for startup ordering, but current
gateway event handlers do not persist data.

## Runtime architecture

- `src/mikro-orm.config.ts` is the shared MikroORM config for application and CLI
  commands.
- `src/db/db.ts` initializes one cached `MikroORM` instance and, by default,
  applies pending migrations with `orm.migrator.up()` before returning. Only
  `src/api.ts` calls `initORM` (so `both` mode migrates once via the API
  import). The gateway process does **not** run migrations, which avoids
  concurrent `migrator.up()` when Compose starts separate `api` and `gateway`
  containers. The API waits for that init before listening. HTTP interaction
  handlers fork an entity manager for request-scoped work.
- Production and development Compose files run MariaDB `12.0.2-noble` as the
  `database` service. Data is persisted in the `mysqldbdata` volume.
- The app connects with the `.env` database variables:
  `DB_HOST`, `MARIADB_DATABASE`, `MARIADB_USER`, `MARIADB_PASSWORD`, and
  `MARIADB_TCP_PORT`.

The MikroORM CLI loads the compiled config from `dist/src/mikro-orm.config.js`,
and migrations are configured at `dist/src/migrations`. Build TypeScript before
running CLI commands directly outside the Makefile.

```bash
npm run build
npx mikro-orm migration:check
```

## Data model

All persisted entities extend `EntityBase`, which adds:

- UUID primary keys;
- `createdAt` and `updatedAt` timestamps;
- `deletedAt` with the default `excludeDeleted` filter.

The `deletedAt` field is part of uniqueness constraints for guilds, aliases, and
poll responses. This lets soft-deleted records keep historical values while
active rows still enforce uniqueness.

| Entity           | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `DiscordGuild`   | One row per Discord guild, owning aliases and polls.                 |
| `MessageAliased` | Reusable alias text scoped to a guild and alias name.                |
| `Poll`           | Poll title, optional voting role, publication date, and close date.  |
| `PollStep`       | Ordered poll questions and optional descriptions.                    |
| `PollChoice`     | Ordered selectable answers for a poll question.                      |
| `PollResp`       | One member's answer for one poll step, either a choice or free text. |

Command handlers must keep lookups guild-scoped. Alias handlers and poll CTA
handlers use `em.fork()` and query through `DiscordGuild.guildId` before reading
or mutating records.

## Migration workflow

Use the Makefile targets from the repository root when Docker is available:

```bash
make db-check   # Check whether applied migrations match the compiled schema
make db-up      # Apply pending migrations
make db-down    # Roll back one migration step
make db-dump    # Create a database dump from the database container
make db-sh      # Open a shell in the database container
```

Operational notes:

- Application startup applies pending migrations automatically via
  `orm.migrator.up()` inside `initORM`, but only from the API process (`api`
  mode, or `both` because it imports `api`). The dedicated `gateway` process
  never migrates, so parallel Compose containers cannot deadlock on DDL. Tests
  pass `migrate: false` and keep using SchemaGenerator instead.
- A `gateway`-only process therefore assumes the schema is already up to date
  (for example after an `api`/`both` start or `make db-up`).
- `make db-check`, `make db-up`, and `make db-down` remain available for manual
  inspection and ops; they execute the MikroORM CLI in the `api` container with
  the same `.env` database settings as the app.
- Migrations are not wrapped in a transaction (`transactional: false` in the
  config). Review destructive or multi-step migrations carefully and prefer
  additive changes when possible.
- Schema generator dumps are useful for review, but committed schema changes
  should be represented as migrations under `src/migrations/`.

Example local inspection flow:

```bash
make dev
make db-check
make db-up
```

If you run CLI commands by hand instead of through Make, build first and ensure
the database container is reachable:

```bash
npm run build
npx mikro-orm schema:update --dump
```

## Tests

Vitest uses a separate MariaDB service named `dbtest` from
`docker-compose.dev.yml`.

- The test config lives in `tests/mkro-orm-test.config.ts`.
- It connects to database `ptitpotetest` with the test credentials from Compose.
- `tests/vitest.initdb.ts` drops and recreates the schema before the suite using
  MikroORM's schema generator, not the migration runner (`initORM(..., false)`).
- `tests/vitest.setup.ts` initializes the cached ORM once (also without
  migrations) and closes it after the suite.

This keeps tests isolated from the development database, but it also means a
migration can be wrong even when entity-based tests pass. Run `make db-check`
when changing entities or migrations.

## Troubleshooting

- **CLI cannot find the MikroORM config:** run `npm run build` so
  `dist/src/mikro-orm.config.js` exists.
- **Connection refused or unknown host:** confirm the relevant Compose stack is
  running and `DB_HOST` matches the target service (`database` in app containers,
  `dbtest` for test config).
- **Commands work but data is missing after restart:** check whether the
  `mysqldbdata` volume was removed; the production database service stores state
  there.
- **Migration check fails after entity edits:** create or update a migration in
  `src/migrations/`, rebuild, then rerun `make db-check`.
- **Unexpected duplicate-key errors:** inspect soft-deleted rows. Active
  uniqueness depends on the `deletedAt` sentinel value from `EntityBase`.
