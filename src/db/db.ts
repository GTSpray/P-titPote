import { EntityManager, MikroORM, Options } from '@mikro-orm/mariadb';
export interface DBServices {
  orm: MikroORM;
  em: EntityManager;
}

let cache: Promise<DBServices> | undefined;

export function initORM(options: Options, migrate = true): Promise<DBServices> {
  if (!cache) {
    cache = (async () => {
      const orm = await MikroORM.init(options);
      if (migrate) {
        await orm.migrator.up();
      }
      return {
        orm,
        em: orm.em,
      };
    })().catch((err) => {
      cache = undefined;
      throw err;
    });
  }
  return cache;
}
