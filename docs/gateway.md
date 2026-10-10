## Discord Gateway Workflow

The `gateway` service maintains a Discord Gateway WebSocket connection for
event-driven behavior that is not handled by the HTTP `/interactions` endpoint.
It runs separately from the `api` service but uses the same bot token and REST
client.

### Intent

- `src/api.ts` handles signed Discord interaction webhooks.
- `src/gateway.ts` wires the gateway process: presence, event handlers, first
  connection with retry, and process supervision.
- `src/gateway/GatewaySocket.ts` owns shard discovery and shard socket
  lifecycle.
- `src/gateway/ShardSocket.ts` implements the Discord Gateway v10 WebSocket
  protocol details.

### Running the service

Production Compose starts a dedicated `gateway` container from the same
`docker/ptitpote/Dockerfile` image as `api`, with `command: ['gateway']`:

```bash
make start
make logs
```

The CI-published image `ghcr.io/gtspray/ptitpote` is built from source for
registry use only. It does not replace the current Compose deployment flow.
Start it with an arch-specific release tag (`-amd64` or `-arm64`) and the
entrypoint mode `api`, `gateway`, or `both` (see
`docker/ptitpote/entrypoint.sh`, `src/both.ts`, and
[`docs/release.md`](release.md)):

```bash
docker run --env-file .env ghcr.io/gtspray/ptitpote:<version>-amd64 gateway
docker run --env-file .env ghcr.io/gtspray/ptitpote:<version>-arm64 both
```

In development, `make dev` builds TypeScript and starts both `api` and
`gateway`; the gateway process runs `npm run dev:gateway`, which watches the
compiled `dist/src/gateway.js` entrypoint.

Direct npm entrypoints:

```bash
npm run build
npm run start:gateway
npm run dev:gateway
```

Required environment:

- `BOT_TOKEN` is required at startup by the gateway and shared Discord REST
  client.
- `APP_ID` should match the bot application ID. The reaction handler uses it to
  distinguish the bot's own reaction from member reactions.
- `BOT_OWNER_ID` (optional) is the Discord user ID that receives a private
  message once when the gateway emits `Ready`. The API process sends a
  different DM when Express starts listening. Both use
  `src/utils/notifyBotOwner.ts` (`POST /users/@me/channels` then
  `POST /channels/{id}/messages`). Skipped when unset; failures are logged and
  do not stop startup. See [`docs/logging.md`](logging.md#startup-owner-notifications)
  for the full runbook.
- `LOG_LEVEL=debug` enables detailed gateway lifecycle logs.

### Connection lifecycle

1. `GatewaySocket.connect()` calls Discord REST `GET /gateway/bot` to discover
   the WebSocket URL and recommended shard count.
2. Unless a shard count was passed to the constructor, the recommended shard
   count from Discord is used.
3. One `ShardSocket` is created per shard. Shards are started by bucket of
   `session_start_limit.max_concurrency` (5s between buckets), as required for
   Identify. Reconnecting the same shard destroys the previous socket before
   opening a new one. `session_start_limit` is logged
   (`gateway session start limit`, at error level when fewer than 100 session
   starts remain).
4. Each shard connects to Discord Gateway API v10 with JSON encoding:
   `?v=10&encoding=json`.
5. On open, the shard sends an `Identify` payload with:
   - shard tuple `[shardId, shardCount]`;
   - `compress: false`;
   - `large_threshold: 250`;
   - the bot presence (`GatewaySocket.presence`, set by `src/gateway.ts` from
     the `gateway.activity.*` strings), so it survives every re-identify;
   - intents for guilds, guild message reactions, guild messages, and direct
     messages.
6. On `Ready`, the shard stores `session_id` and `resume_gateway_url`.
7. At process start, `src/gateway.ts` retries `GatewaySocket.connect()` (up to 5
   attempts with exponential backoff) because the first connection is not
   covered by the shard recovery loop. If every attempt fails the process logs
   `gateway error` and exits with code 1.

### Heartbeats and resume

The shard heartbeat loop is source-tested in
`tests/src/gateway/ShardSocket.spec.ts`.

- The `Hello` payload supplies `heartbeat_interval`.
- The first heartbeat is delayed by a random jitter within that interval; later
  heartbeats use the exact interval.
- The latest Discord sequence number is stored and sent in heartbeat and resume
  payloads.
- Open, close, and resume operations are bounded by `ShardSocket.maxTimeout`
  (`7000` ms) through `getPromiseWithTimeout`.
- Heartbeat timers are cleared on every server close before recovery runs.
- Recovery goes through a single loop (`ShardSocket.recover()`): only one
  recovery runs at a time, and the shard exposes its lifecycle in
  `ShardSocket.state` (`idle`, `connecting`, `resuming`, `ready`,
  `recovering`, `destroyed`).
- Backoff (`src/gateway/backoff.ts`): the first attempt is immediate, then the
  delay doubles from 1s up to 30s with up to 1s of jitter. The attempt counter
  only resets after a recovered connection stayed up for 60s, so a flapping
  connection keeps backing off. Close code `4008` (rate limited) waits at least
  5s.
- The shard attempts `Resume` when it still has `session_id` +
  `resume_gateway_url` and Discord signals a recoverable disconnect:
  - `Reconnect` opcode;
  - `InvalidSession` with a resumable session (waits 1–5s first, per Discord);
  - WebSocket close codes `1000`, `1001`, `1006` and the `4000`–`4003`, `4005`
    and `4008` app codes;
  - a heartbeat ACK is not received before timeout.
- The client never closes a connection it wants to resume with `1000` or `1001`:
  Discord invalidates the session for those codes. It uses `4000` instead
  (`CLIENT_RECONNECT_CLOSE_CODE`); `1000` is only used by `destroy()` so the bot
  goes offline on shutdown. A close handshake that does not complete within
  `ShardSocket.maxTimeout` terminates the socket.
- An in-flight `open()`/`resume()` fails immediately with a typed error
  (`GatewayClosedError`, `GatewayInvalidSessionError`) when the socket closes or
  Discord sends `InvalidSession`, instead of waiting for the 7s timeout.
- The shard re-identifies (`open()` against the original gateway URL) when:
  - Discord sends `InvalidSession` as not resumable;
  - the close code is `4007` (invalid seq) or `4009` (session timed out), or the
    resume attempt receives one of them (or a non resumable `InvalidSession`);
  - resume is impossible (`session_id` / resume URL missing) or resume failed 3
    times in a row (network errors and timeouts keep the session and retry
    `Resume` first).
- Identify budget: Discord allows 1000 Identify per 24h and resets the token
  past that. `IdentifyLimiter` (shared by all shards) caps Identify at 20 per
  hour; beyond that the shard waits and logs
  `gateway identify budget exhausted, delaying identify`.
- Fatal close codes (`4004`, `4010`–`4014`) mark the shard destroyed and do
  **not** reconnect (token, sharding, or intents misconfiguration). The shard
  emits `GWSEvent.Fatal`; `superviseGateway()` logs
  `gateway fatal close, exiting`, DMs the owner (bounded to 5s) and exits with
  code 1 so the container restart policy takes over. In `both` mode this stops
  the API process too.
- `SIGTERM`/`SIGINT` call `GatewaySocket.destroy()` (close code `1000`, bounded
  to 5s) and exit with code 0.
- Event listeners are isolated by `TypedEventEmitter.emit`: a throwing listener
  is logged (`gateway event listener failed`) and neither stops the other
  listeners nor triggers a reconnect. Invalid or non-object frames are logged and
  ignored. `send()` skips sockets that are not open.
- Unhandled exceptions and rejections are handled by the winston
  `exceptionHandlers`/`rejectionHandlers` in `src/logger.ts`: they are logged to
  `logs/` and the process exits (Compose restarts it). Gateway handlers catch
  their own errors so that a REST or database failure does not reach that path.

### Gateway event handlers

Handlers are registered by `registerGatewayHandlers()` in
`src/gateway/handlers.ts` (exported functions are unit-tested):

- `Ready` (first one only): DMs the owner that the gateway started. The
  presence is part of `Identify`.
- `GuildCreate`: idempotently persists a `DiscordGuild` row for `event.id` via
  `findOrCreateGuild` in `src/db/services/discordGuild.service.ts` (covers first
  join and Ready backfill). The handler forks an entity manager, flushes the
  row, logs `gateway guild_create persisted`, and logs
  `gateway guild_create persist failed` without disconnecting the shard if the
  database write fails. `GuildDelete` is still log-only; leaving a guild does
  not soft-delete `DiscordGuild` or command state.
- `MessageCreate`: when Discord reports an application-command message whose
  command name is `gimme version`, the bot adds a `👀` reaction to that message
  with `PUT /channels/{channel.id}/messages/{message.id}/reactions/{emoji}/@me`.
  Discord documents the command `name` only on the deprecated `interaction`
  object (`interaction_metadata` has none), so `getInteractionCommand()` reads
  both. If the probe never reacts, log a real `MESSAGE_CREATE` payload to check
  which field Discord sends.
- `MessageReactionAdd`: if a non-bot user adds `👀` on a bot-authored message
  (the version reply), the bot removes that user's reaction through Discord
  REST.
- Together, these handlers act as a live probe that the gateway WebSocket is
  receiving events: `/gimme version` is answered by the API, while the `👀`
  reaction (and bounce) only happens if the gateway is up. See
  [`docs/usage/gimme/gimme.md`](usage/gimme/gimme.md).

### Constraints and troubleshooting

- The gateway needs the bot token and Discord network access before it can
  discover the WebSocket URL.
- The bot must be allowed to add reactions and manage message reactions in
  channels where the reaction behavior is expected.
- If gateway behavior is missing but slash commands still work, check that the
  `gateway` container is running; interaction handling only proves the `api`
  service is healthy. A practical probe is `/gimme version`: the text reply
  comes from the API; the `👀` reaction (and bounce) only comes from the
  gateway.
- A `gateway`-only process initializes MikroORM with `migrate: false`, so make
  sure migrations were already applied by an `api`/`both` start or `make db-up`
  before relying on `GuildCreate` persistence.
- If `gateway guild_create persist failed` appears, inspect database
  connectivity and schema state. Alias and poll creation can still create the
  same guild row later through `findOrCreateGuild`, but the gateway log points
  at a broader persistence problem.
- Use `make logs` and search for gateway messages such as `gateway error`,
  `gateway connect failed`, `gateway shard recovering`,
  `gateway shard server closed connection`, `gateway shard recover failed`,
  `gateway shard session lost`, `gateway shard fatal close`,
  `gateway fatal close, exiting`, `gateway identify budget exhausted`,
  `GatewaySocket.connect`, `starting connection`, `opened connection`,
  `send identify packet`, `heartbit acknowledged`, or
  `try to resume connection`.
- Recovery lifecycle warnings/errors are visible at the default log level.
  Set `LOG_LEVEL=debug` for the verbose per-opcode heartbeat/payload trace.

### Implementation map

- Gateway process entrypoint: `src/gateway.ts` (initializes MikroORM with
  `migrate: false` before connecting).
- Event handlers: `src/gateway/handlers.ts`.
- First connection retry: `src/gateway/connectWithRetry.ts`.
- Fatal close, `SIGTERM`/`SIGINT` handling: `src/gateway/supervisor.ts`.
- Shared gateway instance and `BOT_TOKEN` startup check: `src/gateway/index.ts`.
- Shard discovery, `send()` and `destroy()`: `src/gateway/GatewaySocket.ts`.
- WebSocket identify, heartbeat, resume, and dispatch handling:
  `src/gateway/ShardSocket.ts`.
- Close code tables and classification: `src/gateway/closeCodes.ts`.
- Backoff and Identify budget: `src/gateway/backoff.ts`,
  `src/gateway/IdentifyLimiter.ts`.
- Typed attempt errors: `src/gateway/errors.ts`; Identify payload:
  `src/gateway/identify.ts`.
- Gateway event typings: `src/gateway/gatewaytypes.ts`.
- Guild persistence helper: `src/db/services/discordGuild.service.ts`.
- Tests: `tests/src/gateway/*.spec.ts` (`ShardSocket`, `GatewaySocket`,
  `handlers`, `supervisor`, `connectWithRetry`, `backoff`, `IdentifyLimiter`) and
  `tests/src/db/services/discordGuild.service.spec.ts`.
