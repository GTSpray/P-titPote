import * as z from 'zod';

/** Raw Discord slash / subcommand option entry (order is not significant). */
export type NamedOption = {
  name: string;
  type?: number;
  value?: unknown;
};

/**
 * Map Discord options by name. Discord does not guarantee option order,
 * and omitted optional options are simply absent from the array.
 */
export function optionsByName(
  options: NamedOption[] | undefined,
): Record<string, unknown> {
  return Object.fromEntries((options ?? []).map((o) => [o.name, o.value]));
}

export function getOptionValue<T = unknown>(
  options: NamedOption[] | undefined,
  name: string,
): T | undefined {
  return optionsByName(options)[name] as T | undefined;
}

const NamedOptionSchema = z.object({
  name: z.string(),
  type: z.number().optional(),
  value: z.unknown().optional(),
});

/**
 * Parse a Discord options array into a typed object keyed by option name,
 * then validate values with the provided schema.
 */
export function slashOptionsSchema<Output>(
  schema: z.ZodType<Output, Record<string, unknown>>,
) {
  return z.array(NamedOptionSchema).transform(optionsByName).pipe(schema);
}
