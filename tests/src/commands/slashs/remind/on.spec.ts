import {
  on,
  remindOnCommandData,
  remindOnSubCommandData,
} from '../../../../../src/commands/slash/remind/on.js';
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

describe('/remind on', () => {
  let handlerOpts: CommandHandlerOptions<remindOnCommandData>;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let guild_id: string;
  let thread_id: string;
  let owner_id: string;

  const buildSubcommand = (days: number): remindOnSubCommandData => ({
    name: 'on',
    options: [{ name: 'days', type: 4, value: days }],
    type: 1,
  });

  const setup = async (days = 2, channelType = ChannelType.PublicThread) => {
    const subcommand = buildSubcommand(days);
    const data: remindOnCommandData = {
      id: randomDiscordId19(),
      name: 'remind',
      options: [subcommand],
      type: 1,
    };
    const { req, res } = getInteractionCommandHttpMock({ data });
    req.body.channel.type = channelType;
    const dbServices = await initORM();
    handlerOpts = { req, res, dbServices };
    guild_id = <string>req.body.guild_id;
    thread_id = <string>req.body.channel.id;
    owner_id = <string>req.body.member?.user.id;
    const { orm } = await initORM();
    em = orm.em.fork();
    return subcommand;
  };

  it('should refuse outside a thread', async () => {
    const subcommand = await setup(2, ChannelType.GuildText);
    const response = await on(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.on.notThread'),
      },
    });
  });

  it('should refuse on an archived thread', async () => {
    const subcommand = await setup(2);
    handlerOpts.req.body.channel.thread_metadata = {
      archived: true,
      auto_archive_duration: 1440,
      archive_timestamp: '2026-09-01T00:00:00.000Z',
    };
    const response = await on(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.on.archived'),
      },
    });

    em.clear();
    expect(await em.find(ThreadRemind, { threadId: thread_id })).toHaveLength(
      0,
    );
  });

  it('should create a ThreadRemind', async () => {
    const subcommand = await setup(3);
    const response = await on(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.on.success', { days: 3 }),
      },
    });

    em.clear();
    const remind = await em.findOneOrFail(
      ThreadRemind,
      { threadId: thread_id },
      { populate: ['server'] },
    );
    expect(remind.idleDays).toBe(3);
    expect(remind.ownerUserId).toBe(owner_id);
    expect(remind.server.guildId).toBe(guild_id);
  });

  it('should refuse when a reminder already exists', async () => {
    const subcommand = await setup(2);
    const guild = new DiscordGuild(guild_id);
    const existing = new ThreadRemind(thread_id, randomDiscordId19(), 5);
    existing.server = guild;
    await em.persist([guild, existing]).flush();

    const response = await on(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('remind.on.alreadyExists'),
      },
    });
  });

  it('should refuse days outside 1-30', async () => {
    const subcommand = await setup(99);
    const response = await on(handlerOpts, subcommand);

    expect(response?.statusCode).toBe(400);
  });
});
