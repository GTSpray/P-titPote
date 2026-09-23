import {
  status,
  remindStatusCommandData,
} from '../../../../../src/commands/slash/remind/status.js';
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

describe('/remind status', () => {
  let handlerOpts: CommandHandlerOptions<remindStatusCommandData>;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let guild_id: string;
  let thread_id: string;

  beforeEach(async () => {
    const data: remindStatusCommandData = {
      id: randomDiscordId19(),
      name: 'remind',
      options: [{ name: 'status', options: [], type: 1 }],
      type: 1,
    };
    const { req, res } = getInteractionCommandHttpMock({ data });
    req.body.channel.type = ChannelType.PublicThread;
    const dbServices = await initORM();
    handlerOpts = { req, res, dbServices };
    guild_id = <string>req.body.guild_id;
    thread_id = <string>req.body.channel.id;
    const { orm } = await initORM();
    em = orm.em.fork();
  });

  it('should report inactive when no reminder exists', async () => {
    const response = await status(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.status.inactive'),
      },
    });
  });

  it('should report active reminder with days and owner', async () => {
    const ownerId = randomDiscordId19();
    const guild = new DiscordGuild(guild_id);
    const remind = new ThreadRemind(thread_id, ownerId, 7);
    remind.server = guild;
    await em.persist([guild, remind]).flush();

    const response = await status(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.status.active', { days: 7, ownerId }),
      },
    });
  });

  it('should refuse outside a thread', async () => {
    handlerOpts.req.body.channel.type = ChannelType.GuildText;
    const response = await status(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.on.notThread'),
      },
    });
  });
});
