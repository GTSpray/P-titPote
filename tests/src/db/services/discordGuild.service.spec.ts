import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { initORM } from '../../../initORM.js';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { findOrCreateGuild } from '../../../../src/db/services/discordGuild.service.js';
import { expectedDiscordGuild } from '../../../epectedEntities/expectedDiscordGuild.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';

describe('db/services/discordGuild.service', () => {
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  beforeEach(async () => {
    const db = await initORM();
    em = db.orm.em.fork() as typeof em;
  });

  it('creates a DiscordGuild when none exists', async () => {
    const guildId = randomDiscordId19();

    const guild = await findOrCreateGuild(em, guildId);
    await em.flush();

    expect(guild).toEqual(
      expectedDiscordGuild({
        guildId,
      }),
    );

    const stored = await em.findOneOrFail(DiscordGuild, { guildId });
    expect(stored.id).toBe(guild.id);
  });

  it('returns the same DiscordGuild on a second call (idempotent)', async () => {
    const guildId = randomDiscordId19();

    const first = await findOrCreateGuild(em, guildId);
    await em.flush();

    em.clear();
    const second = await findOrCreateGuild(em, guildId);
    await em.flush();

    expect(second.id).toBe(first.id);

    const all = await em.find(DiscordGuild, { guildId });
    expect(all).toHaveLength(1);
  });
});
