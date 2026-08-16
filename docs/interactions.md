# Discord interactions dispatch

P'tit Pote receives Discord HTTP interactions in the Express API service and
dispatches them to slash-command, button, and modal handlers. This guide covers
the request path used by command authors and operators.

## Runtime flow

1. `src/api.ts` assigns a request UUID, returns it as `x-request-id`, and logs
   the access record through the shared Winston logger.
2. `POST /interactions` runs `verifyKeyMiddleware(process.env.PUBLIC_KEY)`.
   Signature verification must see the raw request body, so keep
   `express.json()` after the interactions route.
3. Discord `PING` interactions return `PONG`.
4. `APPLICATION_COMMAND` interactions dispatch by `req.body.data.name` through
   `src/commands/slash/index.ts`.
5. `MESSAGE_COMPONENT` and `MODAL_SUBMIT` interactions dispatch by the CTA action
   embedded in `data.custom_id` through `src/commands/cta/index.ts`.
6. Handlers receive the Express `req`/`res` objects and the shared database
   services initialized from `src/mikro-orm.config.ts`.

When Express successfully starts listening, the API process optionally DMs
`BOT_OWNER_ID` via `src/utils/notifyBotOwner.ts` with a message distinct from
the gateway startup DM.

Unknown command names, CTA action names, modal IDs, or interaction types return a
400 response with a translated error key. Unexpected CTA parsing failures return
the shared unknown-error response and log the request ID.

## Slash commands

Slash commands are declared as `SlashCommandDeclaration` values:

- `builder` is a Discord.js slash-command builder used by `src/register.ts`.
- `handler` receives `CommandHandlerOptions<Data>` and returns an Express
  `Response`.

The root registry is `src/commands/slash/index.ts`:

```ts
export const slashcommands = {
  alias,
  gimme,
  poll,
};
```

`slashcommandsRegister` sets each command name from the registry key before
serializing builders for Discord registration. Adding or renaming a command
therefore requires updating the registry and running the explicit registration
workflow only when you intend to mutate Discord application commands.

Handlers that branch on subcommands should validate `req.body.data` before using
it. Existing commands use Zod and return `errors.invalidCommandPayload` or
`errors.invalidSubcommand` for malformed payloads.

## CTA buttons and modals

Buttons and modals share the CTA registry in `src/commands/cta/index.ts`.
Registered actions currently serve the poll workflow:

```ts
export const cta = {
  pollCreate,
  pollAddQ,
  pollAddC,
  pollPub,
  pollResp,
  pollSummary,
  pollVote,
};
```

CTA `custom_id` values are JSON with this shape:

```json
{ "t": "cta", "d": { "a": "pollPub", "pId": "<poll-id>" } }
```

The dispatcher currently accepts component IDs that start with the exact
`{"t":"cta","d":{"a":"` prefix, then parses the JSON and uses `d.a` as the
registry key. Generate IDs with `JSON.stringify({ t: 'cta', d: { a: ... } })`
so property order stays compatible with the router. Put only compact routing
data in `d`, such as poll, step, or cursor IDs.

Modal submissions expose nested Discord components. Use the helpers in
`src/commands/modals.ts` instead of manually walking the component tree:

- `getInputComponnentById(data, id)` returns one text/select component.
- `getInputComponnentsByPrefix(data, prefix)` returns all matching components,
  which poll choice inputs use for repeated fields.

## Permissions and install contexts

Discord builder permissions limit who can see or invoke commands, but handlers
must still enforce server-side checks because every interaction payload is
untrusted.

- `assertInteractionUserIsModerator(req.body)` accepts administrator, manage
  guild, manage channels, manage messages, kick members, or ban members.
- The assertion requires a guild member payload with permissions. It rejects
  DM/user-install contexts with `errors.notServerScope`.
- Poll draft, publish, and report handlers use the moderator assertion.
- Role-restricted poll voting checks `req.body.member.roles` against the stored
  poll role before opening or accepting votes.

## Responses and localization

Handlers respond directly with Discord interaction response payloads. Prefer the
shared helpers in `src/commands/commonMessages.ts` for common ephemeral errors:

- `errorPayload(content)`
- `notFoundPayload()`
- `notAllowed()`
- `doNotUpdatePublishedPoll()`

User-facing strings should come from `src/i18n/fr.ts` through `t(key, params)`.
The translation helper replaces `{token}` placeholders and leaves unknown
placeholders unchanged, so missing params are visible during testing.

## Observability and troubleshooting

- Use the `x-request-id` response header and `reqId` log field to correlate the
  Morgan access log with handler logs.
- Set `LOG_LEVEL=debug` to log interaction payloads and Zod validation details.
- If slash commands return unknown-command errors, check the command name in
  `req.body.data.name` and the `slashcommands` registry.
- If buttons or modals return unknown-modal errors, inspect the JSON
  `custom_id`, the exact prefix, and the `d.a` action key.
- If a handler fails before business logic runs, confirm `PUBLIC_KEY` is set and
  `express.json()` has not been moved before `POST /interactions`.
- If handlers reach the database but fail per request, check that they fork the
  entity manager (`dbServices.orm.em.fork()`) before loading or mutating state.

## Test map

Interaction behavior is covered through focused command and CTA tests:

- slash-command tests under `tests/src/commands/slashs/`;
- CTA and modal tests under `tests/src/cta/`;
- HTTP mocks in `tests/mocks/getInteractionHttpMock.ts`;
- Discord REST mocks in `tests/mocks/discordjs.ts`.

When adding a new interaction path, cover malformed payloads, permission
failures, successful responses, and any database side effects that must persist
or roll back together.
