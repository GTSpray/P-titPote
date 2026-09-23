import { EntityManager } from '@mikro-orm/core';
import type { Transaction } from '../../cqrs/transaction.js';
import config from '../../mikro-orm.config.js';
import { initORM } from '../db.js';

const sessions = new WeakMap<Transaction, EntityManager>();

async function rootEm(): Promise<EntityManager> {
  const { orm } = await initORM(config, false);
  return orm.em;
}

export async function resolveEm(
  transaction?: Transaction,
): Promise<EntityManager> {
  if (transaction) {
    const em = sessions.get(transaction);
    if (!em) {
      throw new Error('Unknown transaction');
    }
    return em;
  }
  const em = await rootEm();
  return em.fork();
}

export async function withTransaction<T>(
  work: (transaction: Transaction) => Promise<T>,
): Promise<T> {
  const em = await rootEm();
  return em.fork().transactional(async (txEm) => {
    const transaction = {} as Transaction;
    sessions.set(transaction, txEm);
    try {
      return await work(transaction);
    } finally {
      sessions.delete(transaction);
    }
  });
}
