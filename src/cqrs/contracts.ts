import type { Transaction } from './transaction.js';

export type ListOptions = {
  limit?: number;
  after?: string | number;
};

export type ListResult<Entity> = {
  items: Entity[];
};

export interface Computer<Entity, Context> {
  compute(entity: Entity, context: Context): Promise<Entity>;
}

export interface Notifier<Entity> {
  notify(entity: Entity): Promise<void>;
}

export interface Subscriber<Entity> {
  subscribe(entity: Entity, transaction?: Transaction): Promise<void>;
}

export interface Finder<Entity, Criteria> {
  findOrFail(criteria: Criteria, transaction?: Transaction): Promise<Entity>;
}

export interface TryFinder<Entity, Criteria> {
  find(criteria: Criteria, transaction?: Transaction): Promise<Entity | null>;
}

export interface Lister<Criteria, Entity> {
  list(
    criteria: Criteria,
    options?: ListOptions,
    transaction?: Transaction,
  ): Promise<ListResult<Entity>>;
}

export interface PaginatedLister<Criteria, Entity> {
  list(
    criteria: Criteria,
    options: ListOptions,
    transaction?: Transaction,
  ): Promise<ListResult<Entity>>;
}

export interface Counter<Criteria> {
  count(criteria: Criteria, transaction?: Transaction): Promise<number>;
}

export interface Persister<Entity> {
  persist(entity: Entity, transaction?: Transaction): Promise<void>;
}

export interface BulkPersister<Entity> {
  bulkPersist(entities: Entity[], transaction?: Transaction): Promise<void>;
}

export interface Remover<Entity> {
  remove(entity: Entity, transaction?: Transaction): Promise<void>;
}

/** Read that takes a row lock for the rest of the caller's transaction. */
export interface LockingFinder<Entity, Criteria> {
  findOrFailForUpdate(
    criteria: Criteria,
    transaction: Transaction,
  ): Promise<Entity>;
}
