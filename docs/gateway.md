## Discord Gateway Workflow

The `gateway` service maintains a Discord Gateway WebSocket connection for
event-driven behavior that is not handled by the HTTP `/interactions` endpoint.
It runs separately from the `api` service but uses the same bot token and REST
client.

### Intent

- `src/api.ts` handles signed Discord interaction webhooks.
- `src/gateway.ts` listens to Discord dispatch events over WebSocket, sets the
  bot presence, and handles reaction-based behavior.
- `src/gateway/GatewaySocket.ts` owns shard discovery and shard socket
  lifecycle.
- `src/gateway/ShardSocket.ts` implements the Discord Gateway v10 WebSocket
  protocol details.

### Running the service

Production Compose starts a dedicated `gateway` container from the
`docker/ptitpote/Dockerfile` `gateway` target:

```bash
make start
make logs
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
- `LOG_LEVEL=debug` enables detailed gateway lifecycle logs.

### Connection lifecycle

1. `GatewaySocket.connect()` calls Discord REST `GET /gateway/bot` to discover
   the WebSocket URL and recommended shard count.
2. Unless a shard count was passed to the constructor, the recommended shard
   count from Discord is used.
3. One `ShardSocket` is created per shard. Reconnecting the same shard closes
   the previous socket before opening a new one.
4. Each shard connects to Discord Gateway API v10 with JSON encoding:
   `?v=10&encoding=json`.
5. On open, the shard sends an `Identify` payload with:
   - shard tuple `[shardId, shardCount]`;
   - `compress: false`;
   - `large_threshold: 250`;
   - intents for guild message reactions, guild messages, and direct messages.
6. On `Ready`, the shard stores `session_id` and `resume_gateway_url`, and the
   top-level gateway sends an online presence using the translated
   `gateway.activity.*` strings.

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
- The shard attempts `Resume` when:
  - Discord sends a `Reconnect` opcode;
  - Discord sends `InvalidSession` with a resumable session;
  - the WebSocket closes with abnormal closure (`1006`);
  - a heartbeat ACK is not received before timeout.
- If Discord sends `InvalidSession` as not resumable, the shard closes and opens
  a fresh connection against the original gateway URL.

### Gateway event handlers

Current top-level behavior in `src/gateway.ts`:

- `Ready`: sends the bot presence (`Playing`, online).
- `GuildCreate` and `GuildDelete`: logs guild lifecycle dispatches.
- `MessageCreate`: when Discord reports an application-command message whose
  interaction metadata name is `poll c`, the bot adds a `✉️` reaction to that
  message with `PUT /channels/{channel.id}/messages/{message.id}/reactions`.
- `MessageReactionAdd`: logs the reaction. If a non-bot user adds `✉️`, the bot
  removes that user's reaction through Discord REST.

### Constraints and troubleshooting

- The gateway needs the bot token and Discord network access before it can
  discover the WebSocket URL.
- The bot must be allowed to add reactions and manage message reactions in
  channels where the reaction behavior is expected.
- If gateway behavior is missing but slash commands still work, check that the
  `gateway` container is running; interaction handling only proves the `api`
  service is healthy.
- Use `make logs` and search for gateway messages such as `gateway error`,
  `GatewaySocket.connect`, `starting connection`, `opened connection`,
  `send identify packet`, `heartbit acknowledged`, or
  `try to resume connection`.
- Detailed lifecycle messages are logged at debug level, so set
  `LOG_LEVEL=debug` when investigating connection or resume issues.

### Implementation map

- Gateway process entrypoint: `src/gateway.ts`.
- Shared gateway instance and `BOT_TOKEN` startup check: `src/gateway/index.ts`.
- Shard discovery and public `send()` method: `src/gateway/GatewaySocket.ts`.
- WebSocket identify, heartbeat, resume, and dispatch handling:
  `src/gateway/ShardSocket.ts`.
- Gateway event typings: `src/gateway/gatewaytypes.ts`.
- Tests: `tests/src/gateway/GatewaySocket.spec.ts` and
  `tests/src/gateway/ShardSocket.spec.ts`.
