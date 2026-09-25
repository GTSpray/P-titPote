/** Thrown when creating a new alias would exceed the per-guild limit. */
export class MessageAliasLimitReachedError extends Error {
  constructor() {
    super('Message alias limit reached');
    this.name = 'MessageAliasLimitReachedError';
  }
}

/** Thrown when no alias matches the given guild/alias criteria. */
export class MessageAliasNotFoundError extends Error {
  constructor(public readonly alias: string) {
    super(`Message alias not found: ${alias}`);
    this.name = 'MessageAliasNotFoundError';
  }
}
