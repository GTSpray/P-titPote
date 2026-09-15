import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { remindOn } from '../../../../src/commands/cta/remind/remindOn.js';
import {
  CTAData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionModalHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  ChannelType,
  ComponentType,
  InteractionResponseType,
  type APIThreadChannel,
} from 'discord-api-types/v10';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { ThreadRemind } from '../../../../src/db/entities/ThreadRemind.entity.js';
import { t } from '../../../../src/i18n/index.js';
import { expectedDiscordGuild } from '../../../epectedEntities/expectedDiscordGuild.js';
import { expectedRemind } from '../../../epectedEntities/expectedRemind.js';
import {
  getModalLabelComponnents,
  PartialComponentSingle,
} from '../../../helpers/getModalLabelComponnents.js';

const usePublicThread = (
  channel: { type: ChannelType; id: string } | null | undefined,
  archived = false,
) => {
  if (!channel) {
    throw new Error('interaction mock body is missing channel');
  }
  const thread = channel as APIThreadChannel;
  thread.type = ChannelType.PublicThread;
  if (archived) {
    thread.thread_metadata = {
      archived: true,
      locked: false,
      auto_archive_duration: 1440,
      archive_timestamp: '2026-09-01T00:00:00.000Z',
    };
  }
  return thread;
};

describe('cta/remindOn', () => {
  const makeOpts = async (days: string) => {
    const daysCmp: PartialComponentSingle = {
      custom_id: 'days',
      type: ComponentType.TextInput,
      value: days,
    };
    const data: CTAData = {
      components: getModalLabelComponnents([daysCmp]),
      custom_id: `{"t":"cta","d":{"a":"remindOn"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({ data });
    const channel = usePublicThread(req.body.channel);
    const dbServices = await initORM();
    const { orm } = await initORM();
    const handlerOpts: ModalHandlerOptions<CTAData> = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };
    return {
      handlerOpts,
      em: orm.em.fork() as SqlEntityManager<
        AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
      >,
      guild_id: <string>req.body.guild_id,
      thread_id: channel.id,
      owner_id: <string>req.body.member?.user.id,
    };
  };

  it('should create a ThreadRemind', async () => {
    const { handlerOpts, em, guild_id, thread_id, owner_id } =
      await makeOpts('3');

    const response = await remindOn.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.on.success', { days: 3 }),
        components: [],
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

  it('should refuse on an archived thread', async () => {
    const { handlerOpts, em, thread_id } = await makeOpts('2');
    usePublicThread(handlerOpts.req.body.channel, true);

    const response = await remindOn.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.on.archived'),
        components: [],
      },
    });

    em.clear();
    expect(await em.find(ThreadRemind, { threadId: thread_id })).toHaveLength(
      0,
    );
  });

  it('should refuse when a reminder already exists', async () => {
    const { handlerOpts, em, guild_id, thread_id } = await makeOpts('2');
    const guild = new DiscordGuild(guild_id);
    const existing = new ThreadRemind(thread_id, randomDiscordId19(), 5);
    existing.server = guild;
    await em.persist([guild, existing]).flush();

    const response = await remindOn.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.on.alreadyExists'),
        components: [],
      },
    });
  });

  it('should refuse outside a thread', async () => {
    const { handlerOpts } = await makeOpts('3');
    if (handlerOpts.req.body.channel) {
      handlerOpts.req.body.channel.type = ChannelType.GuildText;
    }

    const response = await remindOn.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.on.notThread'),
        components: [],
      },
    });
  });

  it('should refuse days outside 1-30', async () => {
    const { handlerOpts } = await makeOpts('99');

    const response = await remindOn.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.days.invalid'),
        components: [],
      },
    });
  });

  it('should refuse a non-numeric day count', async () => {
    const { handlerOpts } = await makeOpts('abc');

    const response = await remindOn.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.days.invalid'),
        components: [],
      },
    });
  });
});
