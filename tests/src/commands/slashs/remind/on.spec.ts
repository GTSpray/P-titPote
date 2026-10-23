import {
  on,
  remindOnCommandData,
  remindOnSubCommandData,
} from '../../../../../src/commands/slash/remind/on.js';
import {
  ChannelType,
  InteractionResponseType,
  MessageFlags,
  type APIThreadChannel,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { interactionBodyChannel } from '../../../../mocks/interactionBodyChannel.js';
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
import { REMIND_DAYS_MAX } from '../../../../../src/shared/remind/constants.js';
import { expectedDiscordGuild } from '../../../../epectedEntities/expectedDiscordGuild.js';
import { expectedRemind } from '../../../../epectedEntities/expectedRemind.js';

const buildSubcommand = (days: number): remindOnSubCommandData => ({
  name: 'on',
  options: [{ name: 'days', type: 4, value: days }],
  type: 1,
});

const buildRemindOnData = (
  subcommand: remindOnSubCommandData,
): remindOnCommandData => ({
  id: randomDiscordId19(),
  name: 'remind',
  options: [subcommand],
  type: 1,
});

describe('/remind on', () => {
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  it('should refuse outside a thread', async () => {
    const subcommand = buildSubcommand(2);
    const { req, res } = getInteractionCommandHttpMock({
      data: buildRemindOnData(subcommand),
    });
    interactionBodyChannel(req).type = ChannelType.GuildText;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOnCommandData> = {
      req,
      res,
      dbServices,
    };

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
    const subcommand = buildSubcommand(2);
    const { req, res } = getInteractionCommandHttpMock({
      data: buildRemindOnData(subcommand),
    });
    const channel = interactionBodyChannel(req) as APIThreadChannel;
    channel.type = ChannelType.PublicThread;
    channel.thread_metadata = {
      archived: true,
      locked: false,
      auto_archive_duration: 1440,
      archive_timestamp: '2026-09-01T00:00:00.000Z',
    };
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOnCommandData> = {
      req,
      res,
      dbServices,
    };
    const thread_id = channel.id;
    const { orm } = await initORM();
    em = orm.em.fork();

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
    const subcommand = buildSubcommand(3);
    const { req, res } = getInteractionCommandHttpMock({
      data: buildRemindOnData(subcommand),
    });
    const channel = interactionBodyChannel(req);
    channel.type = ChannelType.PublicThread;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOnCommandData> = {
      req,
      res,
      dbServices,
    };
    const guild_id = <string>req.body.guild_id;
    const thread_id = channel.id;
    const owner_id = <string>req.body.member?.user.id;
    const { orm } = await initORM();
    em = orm.em.fork();

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
    expect(remind).toEqual(
      expectedRemind({
        threadId: thread_id,
        ownerUserId: owner_id,
        idleDays: 3,
        server: expectedDiscordGuild({ guildId: guild_id }),
      }),
    );
  });

  it('should refuse when a reminder already exists', async () => {
    const subcommand = buildSubcommand(2);
    const { req, res } = getInteractionCommandHttpMock({
      data: buildRemindOnData(subcommand),
    });
    const channel = interactionBodyChannel(req);
    channel.type = ChannelType.PublicThread;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOnCommandData> = {
      req,
      res,
      dbServices,
    };
    const guild_id = <string>req.body.guild_id;
    const thread_id = channel.id;
    const { orm } = await initORM();
    em = orm.em.fork();

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
    const subcommand = buildSubcommand(99);
    const { req, res } = getInteractionCommandHttpMock({
      data: buildRemindOnData(subcommand),
    });
    interactionBodyChannel(req).type = ChannelType.PublicThread;
    const dbServices = await initORM();
    const handlerOpts: CommandHandlerOptions<remindOnCommandData> = {
      req,
      res,
      dbServices,
    };

    const response = await on(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(400, {
      error: t('errors.invalidSubcommandPayload'),
      issues: expect.arrayContaining([
        {
          code: 'too_big',
          maximum: REMIND_DAYS_MAX,
          inclusive: true,
          origin: 'number',
          path: [],
          message: `Too big: expected number to be <=${REMIND_DAYS_MAX}`,
        },
      ]),
    });
  });
});
