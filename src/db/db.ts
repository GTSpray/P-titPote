import { EntityManager, MikroORM, Options } from "@mikro-orm/mariadb";
export interface DBServices {
  orm: MikroORM;
  em: EntityManager;
}

let cache: DBServices;
export async function initORM(options?: Options): Promise<DBServices> {
  if (cache) {
    return cache;
  }

  const orm = await MikroORM.init(options);

  // save to cache before returning
  return (cache = {
    orm,
    em: orm.em,
  });
}
