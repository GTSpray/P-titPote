# Database and migration workflow

P'tit Pote stores guild-scoped command state in MariaDB through MikroORM. The
database is used by the alias command family, the poll workflow, and the
gateway `GuildCreate` handler (which ensures a `DiscordGuild` row exists).

## Runtime architecture

- `src/mikro-orm.config.ts` is the shared MikroORM config for application and CLI
  commands.
- `src/db/db.ts` initializes one cached `MikroORM` instance and, by default,
  applies pending migrations with `orm.migrator.up()` before returning.
  `src/api.ts` calls `initORM` with migrations enabled (so `both` mode
  migrates once via the API import). The gateway process also calls `initORM`
  but with `migrate: false`, which avoids concurrent `migrator.up()` when
  Compose starts separate `api` and `gateway` containers. The API waits for
  that init before listening. HTTP interaction handlers and the gateway
  `GuildCreate` handler call command handlers. `withTransaction` forks an
  entity manager for that work.
- `src/db/model/` is the only application code that queries MikroORM.
  Discord handlers and `src/domain/` pass plain entities from `src/entities/`
  and an opaque `Transaction`. See [`docs/cqrs.md`](cqrs.md).
- `src/db/services/discordGuild.service.ts` still exposes `findOrCreateGuild`
  for the service test. Gateway `GuildCreate` uses `EnsureGuildCommandHandler`
  instead.
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

Command handlers must keep lookups guild-scoped. They call model-layer
finders with `guildId` and never import MikroORM entity classes. Alias and
poll writes go through `withTransaction` so several repositories share one
session. `DiscordGuildPersister` flushes inside the model layer.

`findOrCreateGuild` stays as the entity-manager helper covered by its service
test: it looks up an active `DiscordGuild` by `guildId`, persists a new managed
entity when none exists, and leaves `flush()` to the caller.

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

## Database dumps

`make db-dump` executes `/database/bin/db-dump` inside the `database` container.
The Compose mount maps `./docker/database/dumps` on the host to
`/database/dumps` in the container, so generated files stay outside the database
volume and are ignored by Git.

Each run creates or updates these files:

| Path under `docker/database/dumps/`   | Contents                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `sql/1_<database>_structure.sql`      | Schema-only dump from `mariadb-dump --no-data`.                                          |
| `sql/2_<database>_data.sql`           | Data-only dump with one insert per line and foreign key checks disabled around the load. |
| `<YYYY-MM-DD>_<HH:MM:SS>-dump.tar.gz` | Archive of the SQL files from that run.                                                  |

Constraints and restore notes:

- The SQL file names are stable and are overwritten by the next dump for the
  same database name. Keep the timestamped tarball when you need to retain a
  point-in-time snapshot.
- Do not commit dump artifacts. `docker/database/dumps` is ignored because the
  files may contain server data.
- There is no dedicated restore Make target. `make db-sh` opens a MariaDB shell
  as root for manual inspection or import.
- Compose also mounts `docker/database/dumps/sql` into
  `/docker-entrypoint-initdb.d`. The MariaDB image only reads that directory
  when initializing an empty data directory, so replaying those SQL files through
  the entrypoint requires a fresh database volume.

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
- **Dump output is missing:** ensure the `database` container is running and the
  host `docker/database/dumps` directory is writable by Docker.
