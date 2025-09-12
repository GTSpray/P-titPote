import {
  EntityManager,
  EntityRepository,
  MikroORM,
  Options,
} from "@mikro-orm/mysql";

import { DiscordGuild } from "./entities/DiscordGuild.entity.js";
import { MessageAliased } from "./entities/MessageAliased.entity.js";

export interface DBServices {
  orm: MikroORM;
  em: EntityManager;
  guild: EntityRepository<DiscordGuild>;
  messages: EntityRepository<MessageAliased>;
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
    guild: orm.em.getRepository(DiscordGuild),
    messages: orm.em.getRepository(MessageAliased),
  });
}
