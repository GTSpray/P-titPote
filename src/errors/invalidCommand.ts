import * as z from 'zod';

/** Thrown when a Query payload fails Zod validation. */
export class InvalidCommand extends Error {
  constructor(public readonly issues: z.core.$ZodIssue[]) {
    super('Invalid command');
    this.name = 'InvalidCommand';
  }
}

/** Parse with Zod; on failure throw {@link InvalidCommand} instead of ZodError. */
export function parseCommand<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new InvalidCommand(result.error.issues);
  }
  return result.data;
}
