import { WsClosedCode } from './gatewaytypes.js';

/**
 * Close code used when the client drops a connection it intends to Resume.
 * Discord invalidates the session when the client closes with 1000 or 1001,
 * so any other code must be used for zombie connections and reconnects.
 * https://discord.com/developers/docs/events/gateway#connections
 */
export const CLIENT_RECONNECT_CLOSE_CODE = 4000;

/** Close code used when the process really wants the bot to go offline. */
export const CLIENT_SHUTDOWN_CLOSE_CODE = WsClosedCode.NormalClosure;

/** Close codes that must not trigger reconnect (token / sharding / intents misconfig). */
export const FATAL_GATEWAY_CLOSE_CODES: ReadonlySet<number> = new Set([
  WsClosedCode.AuthenticationFailed,
  WsClosedCode.InvalidShard,
  WsClosedCode.ShardingRequired,
  WsClosedCode.InvalidApiVersion,
  WsClosedCode.InvalidIntents,
  WsClosedCode.DisallowedIntents,
]);

/** Close codes after which the session is lost: a fresh Identify is required. */
export const IDENTIFY_REQUIRED_CLOSE_CODES: ReadonlySet<number> = new Set([
  WsClosedCode.InvalidSeq,
  WsClosedCode.SessionTimedOut,
]);

/** Close codes that ask the client to slow down before reconnecting. */
export const SLOW_RECONNECT_CLOSE_CODES: ReadonlySet<number> = new Set([
  WsClosedCode.RateLimited,
]);

export const RATE_LIMITED_MIN_DELAY_MS = 5000;

export type CloseCodeAction = 'fatal' | 'identify' | 'resume';

export function classifyCloseCode(code: number): CloseCodeAction {
  if (FATAL_GATEWAY_CLOSE_CODES.has(code)) {
    return 'fatal';
  }
  if (IDENTIFY_REQUIRED_CLOSE_CODES.has(code)) {
    return 'identify';
  }
  return 'resume';
}

const specificStatusCodeMappings = new Map([
  [1000, 'Normal Closure'],
  [1001, 'Going Away'],
  [1002, 'Protocol Error'],
  [1003, 'Unsupported Data'],
  [1004, '(For future)'],
  [1005, 'No Status Received'],
  [1006, 'Abnormal Closure'],
  [1007, 'Invalid frame payload data'],
  [1008, 'Policy Violation'],
  [1009, 'Message too big'],
  [1010, 'Missing Extension'],
  [1011, 'Internal Error'],
  [1012, 'Service Restart'],
  [1013, 'Try Again Later'],
  [1014, 'Bad Gateway'],
  [1015, 'TLS Handshake'],
  [4000, 'Unknown Error'],
  [4001, 'Unknown Opcode'],
  [4002, 'Decode Error'],
  [4003, 'Not Authenticated'],
  [4004, 'Authentication Failed'],
  [4005, 'Already Authenticated'],
  [4007, 'Invalid Seq'],
  [4008, 'Rate Limited'],
  [4009, 'Session Timed Out'],
  [4010, 'Invalid Shard'],
  [4011, 'Sharding Required'],
  [4012, 'Invalid API Version'],
  [4013, 'Invalid Intent(s)'],
  [4014, 'Disallowed Intent(s)'],
]);

export function getStatusCodeString(code: number): string {
  if (code >= 0 && code <= 999) {
    return '(Unused)';
  } else if (code >= 1016) {
    if (code <= 1999) {
      return '(For WebSocket standard)';
    } else if (code <= 2999) {
      return '(For WebSocket extensions)';
    } else if (code <= 3999) {
      return '(For libraries and frameworks)';
    } else if (code <= 4999) {
      return specificStatusCodeMappings.get(code) || '(For applications)';
    }
  }
  return specificStatusCodeMappings.get(code) || '(Unknown)';
}
