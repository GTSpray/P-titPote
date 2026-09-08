import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import {
  getOptionValue,
  optionsByName,
  slashOptionsSchema,
} from '../../../src/commands/options.js';

describe('optionsByName', () => {
  it('maps options by name regardless of order', () => {
    expect(
      optionsByName([
        { name: 'message', value: 'hello' },
        { name: 'alias', value: 'welcome' },
      ]),
    ).toEqual({
      message: 'hello',
      alias: 'welcome',
    });
  });

  it('returns an empty object for undefined options', () => {
    expect(optionsByName(undefined)).toEqual({});
  });
});

describe('getOptionValue', () => {
  it('returns the value for a named option', () => {
    expect(
      getOptionValue(
        [
          { name: 'message', value: 'hello' },
          { name: 'alias', value: 'welcome' },
        ],
        'alias',
      ),
    ).toBe('welcome');
  });

  it('returns undefined when the option is missing', () => {
    expect(
      getOptionValue([{ name: 'alias', value: 'welcome' }], 'message'),
    ).toBe(undefined);
  });
});

describe('slashOptionsSchema', () => {
  const schema = slashOptionsSchema(
    z.object({
      alias: z.string().min(1),
      message: z.string().min(1),
    }),
  );

  it('parses options by name when order is swapped', () => {
    const result = schema.safeParse([
      { name: 'message', type: 3, value: 'hello' },
      { name: 'alias', type: 3, value: 'welcome' },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        alias: 'welcome',
        message: 'hello',
      });
    }
  });

  it('fails when a required option is missing', () => {
    const result = schema.safeParse([
      { name: 'alias', type: 3, value: 'welcome' },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['message'],
          }),
        ]),
      );
    }
  });
});
