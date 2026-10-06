export interface Finder<Entity, Criteria> {
  findOrFail(criteria: Criteria): Promise<Entity>;
}

export interface Lister<Entity, Criteria> {
  list(criteria: Criteria): Promise<Entity[]>;
}

export interface Persister<Entity> {
  persist(entity: Entity): Promise<void>;
}

export interface Remover<Entity> {
  remove(entity: Entity): Promise<void>;
}
