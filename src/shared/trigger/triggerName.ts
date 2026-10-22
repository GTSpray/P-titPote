import * as z from 'zod';

/** Lowercase letters, digits, spaces, underscore, hyphen, and period. */
export const TRIGGER_NAME_REGEX = /^[a-z0-9 _.-]+$/;

export const triggerNameSchema = z
  .string()
  .trim()
  .regex(TRIGGER_NAME_REGEX)
  .min(1)
  .max(50);
