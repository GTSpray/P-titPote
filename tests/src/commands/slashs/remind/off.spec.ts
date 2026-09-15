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

describe('/remind off', () => {
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  const setup = async ({
    permissions = default_member_permissions,
    asOwner = true,
    withRemind = true,
  }: {
    permissions?: string;
    asOwner?: boolean;
    withRemind?: boolean;
  } = {}) => {
    const data: remindOffCommandData = {
      id: randomDiscordId19(),
      name: 'remind',
      options: [{ name: 'off', options: [], type: 1 }],
      type: 1,
    };
    const { req, res } = getInteractionCommandHttpMock({
      data,
      permissions,
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

    let remind: ThreadRemind | undefined;
    if (withRemind) {
      const guild = new DiscordGuild(guild_id);
      const ownerUserId = asOwner ? callerId : randomDiscordId19();
      remind = new ThreadRemind(thread_id, ownerUserId, 2);
      remind.server = guild;
      await em.persist([guild, remind]).flush();
    }

    return { handlerOpts, remind, thread_id };
  };

  it('should allow the owner to turn off', async () => {
    const { handlerOpts, thread_id } = await setup({ asOwner: true });
    const response = await off(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.off.success'),
      },
    });

    em.clear();
    const remind = await em.findOne(ThreadRemind, { threadId: thread_id });
    expect(remind).toBeNull();
  });

  it('should allow a moderator to turn off', async () => {
    const { handlerOpts, thread_id } = await setup({
      asOwner: false,
      permissions: admin_permissions,
    });
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
    const { handlerOpts } = await setup({
      asOwner: false,
      permissions: default_member_permissions,
    });
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
    const { handlerOpts } = await setup({ withRemind: false });
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
