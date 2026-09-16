import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { initORM } from '../../initORM.js';
import { DiscordGuild } from '../../../src/db/entities/DiscordGuild.entity.js';
import { ThreadRemind } from '../../../src/db/entities/ThreadRemind.entity.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';
import {
  REMIND_INTERVAL_MS,
  runRemindTick,
} from '../../../src/utils/remindLoop.js';
import { t } from '../../../src/i18n/index.js';
import { REST } from 'discord.js';
import { computeNextTickAt } from '../../../src/utils/remindConstants.js';

describe('remindLoop', () => {
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let guild_id: string;
  let thread_id: string;
  let remind: ThreadRemind;

  const now = new Date('2026-09-11T12:00:00.000Z');

  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();
    guild_id = randomDiscordId19();
    thread_id = randomDiscordId19();

    const guild = new DiscordGuild(guild_id);
    remind = new ThreadRemind(thread_id, randomDiscordId19(), 2, now);
    remind.server = guild;
    await em.persist([guild, remind]).flush();
  });

  it('should export a 1 hour interval', () => {
    expect(REMIND_INTERVAL_MS).toBe(60 * 60 * 1000);
  });

  it('should soft-delete all guild reminds when the bot left the guild', async () => {
    const otherThread = randomDiscordId19();
    const guild = await em.findOneOrFail(DiscordGuild, { guildId: guild_id });
    const second = new ThreadRemind(otherThread, randomDiscordId19(), 3, now);
    second.server = guild;
    await em.persist(second).flush();

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      Object.assign(new Error('Unknown Guild'), {
        status: 404,
        code: RESTJSONErrorCodes.UnknownGuild,
      }),
    );

    const getSpy = vi.spyOn(REST.prototype, 'get');
    const postSpy = vi.spyOn(REST.prototype, 'post');

    await runRemindTick(em, now);

    em.clear();
    expect(
      await em.find(ThreadRemind, { server: { guildId: guild_id } }),
    ).toHaveLength(0);
    expect(
      getSpy.mock.calls.some(([route]) => String(route).includes('/channels/')),
    ).toBe(false);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('should ignore reminders whose nextTickAt is in the future', async () => {
    remind.nextTickAt = new Date('2099-01-01T00:00:00.000Z');
    await em.flush();
    em.clear();

    const getSpy = vi.spyOn(REST.prototype, 'get');
    const postSpy = vi.spyOn(REST.prototype, 'post');
    await runRemindTick(em, now);

    expect(
      getSpy.mock.calls.some(([route]) =>
        String(route).includes(`/channels/${thread_id}`),
      ),
    ).toBe(false);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('should skip posting when the last message is too recent and schedule nextTickAt', async () => {
    const lastMessageAt = new Date('2026-09-10T18:00:00.000Z');
    const previousBumpId = randomDiscordId19();
    remind.lastBumpMessageId = previousBumpId;
    await em.flush();

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(thread_id),
      },
      [
        {
          id: randomDiscordId19(),
          timestamp: lastMessageAt.toISOString(),
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.delete,
        fullRoute: Routes.channelMessage(thread_id, previousBumpId),
      },
      {},
    );

    const postSpy = vi.spyOn(REST.prototype, 'post');
    const deleteSpy = vi.spyOn(REST.prototype, 'delete');
    await runRemindTick(em, now);

    expect(postSpy).not.toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith(
      Routes.channelMessage(thread_id, previousBumpId),
    );
    em.clear();
    const saved = await em.findOneOrFail(ThreadRemind, { threadId: thread_id });
    expect(saved.lastBumpMessageId).toBeNull();
    expect(saved.nextTickAt.toISOString()).toBe(
      computeNextTickAt(lastMessageAt, 2).toISOString(),
    );
  });

  it('should post the bump message when idle long enough', async () => {
    const bumpMessageId = randomDiscordId19();
    const bumpAt = new Date('2026-09-11T12:00:00.000Z');
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(thread_id),
      },
      [
        {
          id: randomDiscordId19(),
          timestamp: '2026-09-08T11:00:00.000Z',
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(thread_id),
      },
      {
        id: thread_id,
        thread_metadata: { archived: false },
      },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.channelMessages(thread_id),
      },
      {
        id: bumpMessageId,
        timestamp: bumpAt.toISOString(),
      },
    );

    const postSpy = vi.spyOn(REST.prototype, 'post');
    await runRemindTick(em, now);

    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(thread_id), {
      body: {
        content: t('remind.bump.message'),
        allowed_mentions: { parse: [] },
      },
    });

    em.clear();
    const saved = await em.findOneOrFail(ThreadRemind, { threadId: thread_id });
    expect(saved.lastBumpMessageId).toBe(bumpMessageId);
    expect(saved.nextTickAt.toISOString()).toBe(
      computeNextTickAt(bumpAt, 2).toISOString(),
    );
  });

  it('should delete the previous bump message before posting a new one', async () => {
    const previousBumpId = randomDiscordId19();
    const nextBumpId = randomDiscordId19();
    remind.lastBumpMessageId = previousBumpId;
    await em.persist(remind).flush();

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(thread_id),
      },
      [
        {
          id: previousBumpId,
          timestamp: '2026-09-01T00:00:00.000Z',
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(thread_id),
      },
      {
        id: thread_id,
        thread_metadata: { archived: false },
      },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.delete,
        fullRoute: Routes.channelMessage(thread_id, previousBumpId),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.channelMessages(thread_id),
      },
      {
        id: nextBumpId,
        timestamp: '2026-09-11T12:00:00.000Z',
      },
    );

    const deleteSpy = vi.spyOn(REST.prototype, 'delete');
    await runRemindTick(em, now);

    expect(deleteSpy).toHaveBeenCalledWith(
      Routes.channelMessage(thread_id, previousBumpId),
    );

    em.clear();
    const saved = await em.findOneOrFail(ThreadRemind, { threadId: thread_id });
    expect(saved.lastBumpMessageId).toBe(nextBumpId);
  });

  it('should still post when the previous bump was already deleted', async () => {
    const previousBumpId = randomDiscordId19();
    const nextBumpId = randomDiscordId19();
    remind.lastBumpMessageId = previousBumpId;
    await em.persist(remind).flush();

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(thread_id),
      },
      [
        {
          id: randomDiscordId19(),
          timestamp: '2026-09-01T00:00:00.000Z',
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(thread_id),
      },
      {
        id: thread_id,
        thread_metadata: { archived: false },
      },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.delete,
        fullRoute: Routes.channelMessage(thread_id, previousBumpId),
      },
      Object.assign(new Error('Unknown Message'), {
        status: 404,
        code: RESTJSONErrorCodes.UnknownMessage,
      }),
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.channelMessages(thread_id),
      },
      {
        id: nextBumpId,
        timestamp: '2026-09-11T12:00:00.000Z',
      },
    );

    const postSpy = vi.spyOn(REST.prototype, 'post');
    await runRemindTick(em, now);

    expect(postSpy).toHaveBeenCalled();
    em.clear();
    const saved = await em.findOneOrFail(ThreadRemind, { threadId: thread_id });
    expect(saved.lastBumpMessageId).toBe(nextBumpId);
  });

  it('should unarchive before posting when the thread is archived', async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(thread_id),
      },
      [
        {
          id: randomDiscordId19(),
          timestamp: '2026-09-01T00:00:00.000Z',
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(thread_id),
      },
      {
        id: thread_id,
        thread_metadata: { archived: true },
      },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.patch,
        fullRoute: Routes.channel(thread_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.channelMessages(thread_id),
      },
      {
        id: randomDiscordId19(),
        timestamp: '2026-09-11T12:00:00.000Z',
      },
    );

    const patchSpy = vi.spyOn(REST.prototype, 'patch');
    const postSpy = vi.spyOn(REST.prototype, 'post');
    await runRemindTick(em, now);

    expect(patchSpy).toHaveBeenCalledWith(Routes.channel(thread_id), {
      body: { archived: false },
    });
    expect(postSpy).toHaveBeenCalled();
  });

  it('should soft-delete when the channel is missing', async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(thread_id),
      },
      Object.assign(new Error('Unknown Channel'), {
        status: 404,
        code: RESTJSONErrorCodes.UnknownChannel,
      }),
    );

    await runRemindTick(em, now);

    em.clear();
    expect(await em.findOne(ThreadRemind, { threadId: thread_id })).toBeNull();
  });

  it('should keep processing other threads when one fails', async () => {
    const okThread = randomDiscordId19();
    const guild = await em.findOneOrFail(DiscordGuild, { guildId: guild_id });
    const okRemind = new ThreadRemind(okThread, randomDiscordId19(), 2, now);
    okRemind.server = guild;
    await em.persist(okRemind).flush();

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guild(guild_id),
      },
      {},
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(thread_id),
      },
      Object.assign(new Error('boom'), { status: 500 }),
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channelMessages(okThread),
      },
      [
        {
          id: randomDiscordId19(),
          timestamp: '2026-09-01T00:00:00.000Z',
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(okThread),
      },
      { id: okThread, thread_metadata: { archived: false } },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.channelMessages(okThread),
      },
      {
        id: randomDiscordId19(),
        timestamp: '2026-09-11T12:00:00.000Z',
      },
    );

    const postSpy = vi.spyOn(REST.prototype, 'post');
    await runRemindTick(em, now);

    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(okThread), {
      body: {
        content: t('remind.bump.message'),
        allowed_mentions: { parse: [] },
      },
    });
  });
});
