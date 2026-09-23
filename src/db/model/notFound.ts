import { NotFoundError as OrmNotFoundError } from '@mikro-orm/core';
import { NotFoundError } from '../../cqrs/errors.js';

export function rethrowAsNotFound(
  error: unknown,
  message: string,
  criteria: unknown,
): never {
  if (error instanceof OrmNotFoundError) {
    throw new NotFoundError(message, criteria);
  }
  throw error;
}
