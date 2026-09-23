import type { ZodType } from 'zod';
import { BadRequestError } from './errors.js';

type Partialable<T> = ZodType<T> & { partial: () => ZodType<T> };

function isPartialable<T>(schema: ZodType<T>): schema is Partialable<T> {
  return typeof (schema as { partial?: unknown }).partial === 'function';
}

/**
 * Validates `payload` and copies the parsed value back onto it.
 * Throws `BadRequestError` so an invalid instance cannot be constructed.
 */
export function validatePayload<T>(
  payload: Record<string, unknown>,
  schema: ZodType<T>,
  allowPartial = false,
): T {
  const checker =
    allowPartial && isPartialable(schema) ? schema.partial() : schema;
  const result = checker.safeParse(payload);
  if (!result.success) {
    throw new BadRequestError('Invalid payload', result.error.issues);
  }
  Object.assign(payload, result.data);
  return result.data;
}
