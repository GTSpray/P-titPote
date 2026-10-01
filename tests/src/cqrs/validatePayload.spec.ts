import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BadRequestError } from '../../../src/cqrs/errors.js';
import { validatePayload } from '../../../src/cqrs/validatePayload.js';

const schema = z.object({
  name: z.string().min(1),
  ownerId: z.string().min(1),
});

describe('validatePayload', () => {
  it('returns the parsed payload when it matches the schema', () => {
    const payload: Record<string, unknown> = {
      name: 'widget',
      ownerId: 'owner-1',
    };

    const data = validatePayload(payload, schema, false);

    expect(data).toEqual({ name: 'widget', ownerId: 'owner-1' });
    expect(payload.name).toBe('widget');
  });

  it('rejects an invalid payload before a command can keep it', () => {
    expect(() => validatePayload({ name: '' }, schema, false)).toThrow(
      BadRequestError,
    );
  });

  it('allows a partial payload when requested', () => {
    const data = validatePayload({ name: 'widget' }, schema, true);

    expect(data).toEqual({ name: 'widget' });
  });
});
