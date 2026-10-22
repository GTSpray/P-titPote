import {
  off,
  remindOffCommandData,
} from '../../../../../src/commands/slash/remind/off.js';
import {
  ChannelType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import { initORM } from '../../../../initORM.js';
import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { DiscordGuild } from '../../../../../src/db/entities/DiscordGuild.entity.js';
import { ThreadRemind } from '../../../../../src/db/entities/ThreadRemind.entity.js';
import { t } from '../../../../../src/i18n/index.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../../mocks/discord-api/rolePermission.js';

const remindOffData: remindOffCommandData = {
  id: randomDiscordId19(),
  name: 'remind',
  options: [{ name: 'off', options: [], type: 1 }],
  type: 1,
};

describe('/remind off', () => {
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  it('should allow the owner to turn off', async () => {
    const { req, res } = getInteractionCommandHttpMock({
      data: remindOffData,
      permissions: default_member_permissions,
    });
    req.body.channel.type = ChannelType.PublicThread;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOffCommandData> = {
      req,
      res,
      dbServices,
    };
    const guild_id = <string>req.body.guild_id;
    const thread_id = <string>req.body.channel.id;
    const callerId = <string>req.body.member?.user.id;
    const { orm } = await initORM();
    em = orm.em.fork();

    const guild = new DiscordGuild(guild_id);
    const remind = new ThreadRemind(thread_id, callerId, 2);
    remind.server = guild;
    await em.persist([guild, remind]).flush();

    const response = await off(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.off.success'),
      },
    });

    em.clear();
    expect(await em.findOne(ThreadRemind, { threadId: thread_id })).toBeNull();
  });

  it('should allow a moderator to turn off', async () => {
    const { req, res } = getInteractionCommandHttpMock({
      data: remindOffData,
      permissions: admin_permissions,
    });
    req.body.channel.type = ChannelType.PublicThread;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOffCommandData> = {
      req,
      res,
      dbServices,
    };
    const guild_id = <string>req.body.guild_id;
    const thread_id = <string>req.body.channel.id;
    const callerId = <string>req.body.member?.user.id;
    const { orm } = await initORM();
    em = orm.em.fork();

    const guild = new DiscordGuild(guild_id);
    const remind = new ThreadRemind(thread_id, randomDiscordId19(), 2);
    remind.server = guild;
    await em.persist([guild, remind]).flush();

    expect(callerId).not.toBe(remind.ownerUserId);

    const response = await off(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.off.success'),
      },
    });

    em.clear();
    expect(await em.findOne(ThreadRemind, { threadId: thread_id })).toBeNull();
  });

  it('should refuse a non-owner non-moderator', async () => {
    const { req, res } = getInteractionCommandHttpMock({
      data: remindOffData,
      permissions: default_member_permissions,
    });
    req.body.channel.type = ChannelType.PublicThread;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOffCommandData> = {
      req,
      res,
      dbServices,
    };
    const guild_id = <string>req.body.guild_id;
    const thread_id = <string>req.body.channel.id;
    const { orm } = await initORM();
    em = orm.em.fork();

    const guild = new DiscordGuild(guild_id);
    const remind = new ThreadRemind(thread_id, randomDiscordId19(), 2);
    remind.server = guild;
    await em.persist([guild, remind]).flush();

    const response = await off(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notAllowed'),
      },
    });
  });

  it('should return not found when no reminder exists', async () => {
    const { req, res } = getInteractionCommandHttpMock({
      data: remindOffData,
      permissions: default_member_permissions,
    });
    req.body.channel.type = ChannelType.PublicThread;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOffCommandData> = {
      req,
      res,
      dbServices,
    };

    const response = await off(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notFound'),
      },
    });
  });
});
