# Release and container image workflow

P'tit Pote uses semantic-release for GitHub releases and publishes a versioned
runtime image to GitHub Container Registry when a new release is cut.

## Release pipeline

`.github/workflows/release.yml` runs on pushes to `main`:

1. `actions/checkout` fetches full history so semantic-release can inspect tags.
2. `actions/setup-node` installs Node.js 22.
3. `.env.sample` is copied to `.env` for Docker-based build commands.
4. `make bundle` builds TypeScript in the CI Compose stack using the
   `ptitpotebuilder` Dockerfile target and creates `ptitpote.tar.gz` from
   `dist/src`.
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

## Container image

`docker/ptitpote/Dockerfile` builds the application from source for production.
The published image is not assembled from the GitHub release tarball; each image
build receives the repository checkout as its Docker context and compiles the app
inside Docker.

The Dockerfile has three stages:

| Stage             | Purpose                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `ptitpotebase`    | Starts from `node:26-slim`, installs build tools, and copies manifests. |
| `ptitpotebuilder` | Installs dev dependencies, copies source, and runs `npm run build`.     |
| default           | Copies `dist/`, installs `npm ci --omit=dev`, and runs as `node`.       |

A separate `ptitpotebuilder` target is used by development and CI Compose files;
it keeps dev dependencies and is meant for local volume-mounted workflows. The
default production stage keeps only compiled output and production dependencies,
then uses `docker/ptitpote/entrypoint.sh` to start one of three modes.

Production Compose (`make start`) builds the same image for `api` and `gateway`,
passing the mode to the entrypoint:

```yaml
command: ['api'] # api service
command: ['gateway'] # gateway service
```

The published GHCR images use the default production stage. Pick the arch suffix
for the machine that will run the container (`-amd64` or `-arm64`). The entrypoint
accepts one mode:

```bash
docker run --env-file .env ghcr.io/gtspray/ptitpote:<version>-amd64 api
docker run --env-file .env ghcr.io/gtspray/ptitpote:<version>-amd64 gateway
docker run --env-file .env ghcr.io/gtspray/ptitpote:<version>-arm64 both
```

If no mode is provided, the image defaults to `both`, which imports
`src/api.ts` and `src/gateway.ts` in the same Node.js process after compilation.

### Build and deployment paths

Use the path that matches the target environment:

| Path                  | Command or workflow                 | Image/runtime behavior                                      |
| --------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Local production      | `make start`                        | Builds the default production stage and starts `api` + `gateway` containers. |
| Local development     | `make dev`                          | Builds `ptitpotebuilder`, bind-mounts source, and runs watch entrypoints. |
| CI quality gate       | `.github/workflows/qa.yml`          | Runs `make ci`, tests, lint, then builds the production image once. |
| Release archive       | `make bundle` in `release.yml`      | Builds TypeScript in the CI Compose stack and uploads `ptitpote.tar.gz`. |
| Published GHCR image  | Docker Buildx steps in `release.yml` | Builds the default production stage separately for `linux/amd64` and `linux/arm64`. |

Because the production image builds from the repository checkout, Docker layer
caching depends on the source tree and `package*.json` files at build time. The
Dockerfile does not copy `.env`, but the build context is the repository root, so
keep real credentials out of tracked files and avoid using remote builders with
local secrets in the context.

## Runtime requirements

The image contains the Node.js app only. Provide these external dependencies:

- Discord credentials from `.env.sample`: `APP_ID`, `PUBLIC_KEY`, and
  `BOT_TOKEN`.
- MariaDB connection variables: `DB_HOST`, `MARIADB_DATABASE`,
  `MARIADB_USER`, `MARIADB_PASSWORD`, and `MARIADB_TCP_PORT`.
- A writable `/app/logs` directory or volume; Winston writes rotating log files
  under `logs/`.
- Network access to Discord APIs and to MariaDB.

Application startup applies pending migrations automatically from the API
process before it listens (`api` mode, or `both` via the API import). The
dedicated `gateway` process does not migrate, to avoid concurrent migrators
when Compose runs both services. Manual migration CLI targets remain available;
see [`docs/database.md`](database.md).

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
- **Production image is unexpectedly large or stale:** confirm you are building
  the default Dockerfile stage, not `--target ptitpotebuilder`, and rebuild from
  a clean checkout when local bind mounts or generated files may be influencing
  the context.
- **Container exits immediately:** verify the entrypoint mode is one of `api`,
  `gateway`, or `both`, then check required environment variables.
- **Database tables are missing:** confirm an `api` or `both` process reached
  startup successfully (migrations run during API `initORM`, not from
  `gateway`). Use `make db-up` or the MikroORM CLI if you need to apply
  migrations outside a normal API start.
