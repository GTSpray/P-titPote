import { classifyCloseCode } from './closeCodes.js';

export class GatewayClosedError extends Error {
  constructor(
    readonly code: number,
    readonly reason: string,
  ) {
    super(`gateway connection closed with code ${code}: ${reason}`);
    this.name = 'GatewayClosedError';
  }
}

export class GatewayInvalidSessionError extends Error {
  constructor(readonly resumable: boolean) {
    super(`gateway invalid session (resumable: ${resumable})`);
    this.name = 'GatewayInvalidSessionError';
  }
}

/** True when the failure means Discord dropped the session (Resume is pointless). */
export function isSessionLost(error: unknown): boolean {
  if (error instanceof GatewayInvalidSessionError) {
    return !error.resumable;
  }
  if (error instanceof GatewayClosedError) {
    return classifyCloseCode(error.code) === 'identify';
  }
  return false;
}
