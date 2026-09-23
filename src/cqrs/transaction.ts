declare const transactionBrand: unique symbol;

/**
 * Opaque unit of work. Only the model layer can open one and bind it to an ORM
 * session. Callers pass it through without reading it.
 */
export type Transaction = {
  readonly [transactionBrand]?: true;
};

export type TransactionRunner = <T>(
  work: (transaction: Transaction) => Promise<T>,
) => Promise<T>;
