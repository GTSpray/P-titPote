# Release and container image workflow

P'tit Pote uses semantic-release for GitHub releases and publishes a versioned
runtime image to GitHub Container Registry when a new release is cut.

## Release pipeline

`.github/workflows/release.yml` runs on pushes to `main`:

1. `actions/checkout` fetches full history so semantic-release can inspect tags.
2. `actions/setup-node` installs Node.js 22.
3. `.env.sample` is copied to `.env` for Docker-based build commands.
4. `make bundle` builds TypeScript in the CI Compose stack and creates
   `ptitpote.tar.gz` from `dist/src`.
5. `npx semantic-release` reads `.releaserc.json`, updates release metadata, and
   uploads `ptitpote.tar.gz` to the GitHub release as **JS distribution**.
6. If `package.json` changed version during semantic-release, the workflow sets
   up QEMU and Docker Buildx, logs in to GHCR with `GITHUB_TOKEN`, and builds
   two architecture-specific images (not a single multi-arch manifest):

   ```text
   ghcr.io/gtspray/ptitpote:<version>-amd64   # linux/amd64
   ghcr.io/gtspray/ptitpote:<version>-arm64   # linux/arm64
   ```

There is no unprefixed `ghcr.io/gtspray/ptitpote:<version>` tag and no
`latest` tag. Pull the suffix that matches the host CPU.

## Versioning rules

`.releaserc.json` limits releases to `main` and formats tags as `v${version}`.
The explicit commit analyzer rules are:

| Commit type                       | Release impact |
| --------------------------------- | -------------- |
| `feat`                            | minor          |
| `fix`, `perf`, `refactor`, `test` | patch          |
| `chore`                           | patch          |
| `BREAKING CHANGE` notes           | major          |

Release notes group additional commit types such as `docs`, `ci`, and `style`,
but a Docker image is pushed only when semantic-release produces a new version.

## Container targets

`docker/ptitpote/Dockerfile` contains two deployment styles:

| Target            | Used by                          | Behavior                                                                                   |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `api`             | `docker-compose.yml` `api`       | Downloads the GitHub release archive, then runs `npm run start:api`.                       |
| `gateway`         | `docker-compose.yml` `gateway`   | Downloads the GitHub release archive, then runs `npm run start:gateway`.                   |
| `ptitpotebuilder` | development and CI Compose files | Installs dev dependencies and builds local source.                                         |
| `ptitpote`        | GHCR release image and QA build  | Builds local source, installs production dependencies, and uses the entrypoint mode below. |

The Compose production flow (`make start`) still builds the service-specific
`api` and `gateway` targets locally. Those targets download
`https://github.com/GTSpray/P-titPote/releases/download/v<package-version>/ptitpote.tar.gz`,
so the matching GitHub release asset must exist and be reachable.

The published GHCR images use the `ptitpote` target. Pick the arch suffix for
the machine that will run the container (`-amd64` or `-arm64`). The entrypoint
accepts one mode:

```bash
docker run --env-file .env ghcr.io/gtspray/ptitpote:<version>-amd64 api
docker run --env-file .env ghcr.io/gtspray/ptitpote:<version>-amd64 gateway
docker run --env-file .env ghcr.io/gtspray/ptitpote:<version>-arm64 both
```

If no mode is provided, the image defaults to `both`, which imports
`src/api.ts` and `src/gateway.ts` in the same Node.js process after compilation.

## Runtime requirements

The image contains the Node.js app only. Provide these external dependencies:

- Discord credentials from `.env.sample`: `APP_ID`, `PUBLIC_KEY`, and
  `BOT_TOKEN`.
- MariaDB connection variables: `DB_HOST`, `MARIADB_DATABASE`,
  `MARIADB_USER`, `MARIADB_PASSWORD`, and `MARIADB_TCP_PORT`.
- A writable `/app/logs` directory or volume; Winston writes rotating log files
  under `logs/`.
- Network access to Discord APIs and to MariaDB.

Run migrations before serving traffic. Application startup initializes MikroORM
but does not apply migrations automatically; use the migration workflow in
[`docs/database.md`](database.md).

## Operational checks

- **Release ran but no image was pushed:** compare the `Get version before
  release` and `Get version after release` steps. The GHCR login and image
  builds are skipped when the version is unchanged.
- **Pulling `latest` or `<version>` fails:** use an arch-specific tag such as
  `ghcr.io/gtspray/ptitpote:<version>-amd64` or
  `ghcr.io/gtspray/ptitpote:<version>-arm64`. The workflow does not publish
  `latest` or an unprefixed version tag.
- **Wrong-arch image on pull:** choose `-amd64` or `-arm64` to match the host;
  the two tags are separate single-platform images.
- **Container exits immediately:** verify the entrypoint mode is one of `api`,
  `gateway`, or `both`, then check required environment variables.
- **Compose build cannot download the release archive:** confirm
  `package.json` points to a version with a matching GitHub release asset.
- **Database tables are missing:** apply migrations separately with
  `make db-up` or the equivalent MikroORM command before starting the app.
