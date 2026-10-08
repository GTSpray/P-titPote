import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import { initORM } from '../../initORM.js';
import { DiscordGuild } from '../../../src/db/entities/DiscordGuild.entity.js';
import { GuildTrigger } from '../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../src/db/entities/TriggerMessage.entity.js';
import { TriggerRole } from '../../../src/db/entities/TriggerRole.entity.js';
import { runGuildTriggers } from '../../../src/gateway/runGuildTriggers.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';

describe('runGuildTriggers', () => {
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let guild_id: string;
  let user_id: string;
  let channel_id: string;
  let role_id: string;

  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();
    guild_id = randomDiscordId19();
    user_id = randomDiscordId19();
    channel_id = randomDiscordId19();
    role_id = randomDiscordId19();
    DiscrodRESTMock.clear();
  });

  it('should assign role and post welcome message for enabled triggers', async () => {
    const guild = new DiscordGuild(guild_id);
    const msg = new GuildTrigger('welcome', 'welcome_message');
    const messageConfig = new TriggerMessage(
      channel_id,
      'Bienvenue {user} sur {server}',
    );
    messageConfig.trigger = msg;
    msg.messageConfig = messageConfig;
    const role = new GuildTrigger('member', 'welcome_role');
    const roleConfig = new TriggerRole(role_id);
    roleConfig.trigger = role;
    role.roleConfig = roleConfig;
    const disabled = new GuildTrigger('off', 'welcome_role');
    const disabledRole = new TriggerRole(randomDiscordId19());
    disabledRole.trigger = disabled;
    disabled.roleConfig = disabledRole;
    disabled.enabled = false;
    guild.triggers.add(msg);
    guild.triggers.add(role);
    guild.triggers.add(disabled);
    await em.persist(guild).flush();

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      { id: guild_id, name: 'Serveur Test' },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.put,
        fullRoute: Routes.guildMemberRole(guild_id, user_id, role_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.channelMessages(channel_id),
      },
      { id: randomDiscordId19() },
    );

    const getSpy = vi.spyOn(REST.prototype, 'get');
    const putSpy = vi.spyOn(REST.prototype, 'put');
    const postSpy = vi.spyOn(REST.prototype, 'post');

    await runGuildTriggers(em, {
      guild_id,
      user: {
        id: user_id,
        username: 'Alice',
      },
    } as any);

    expect(getSpy).toHaveBeenCalledWith(Routes.guild(guild_id));
    expect(putSpy).toHaveBeenCalledWith(
      Routes.guildMemberRole(guild_id, user_id, role_id),
    );
    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channel_id), {
      body: { content: `Bienvenue <@${user_id}> sur Serveur Test` },
    });
  });

  it('should do nothing when no enabled triggers', async () => {
    const getSpy = vi.spyOn(REST.prototype, 'get');
    await runGuildTriggers(em, {
      guild_id,
      user: {
        id: user_id,
        username: 'Alice',
      },
    } as any);
    expect(getSpy).not.toHaveBeenCalled();
  });
});
