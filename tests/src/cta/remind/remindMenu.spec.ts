import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { remindMenu } from '../../../../src/commands/cta/remind/remindMenu.js';
import type {
  CTASelectData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionMessageComponentHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  ChannelType,
  ComponentType,
  InteractionResponseType,
  Routes,
  TextInputStyle,
  type APIThreadChannel,
} from 'discord-api-types/v10';
import { REST } from 'discord.js';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { ThreadRemind } from '../../../../src/db/entities/ThreadRemind.entity.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import {
  DiscrodRESTMock,
  DiscrodRESTMockVerb,
} from '../../../mocks/discordjs.js';
import { t } from '../../../../src/i18n/index.js';

const menuData = (action: string): CTASelectData => ({
  custom_id: `{"t":"cta","d":{"a":"remindMenu"}}`,
  component_type: ComponentType.StringSelect,
  values: [action],
});

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

describe('cta/remindMenu', () => {
  const makeOpts = async (action: string, permissions?: string) => {
    const data = menuData(action);
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions,
    });
    const channel = usePublicThread(req.body.channel);
    const dbServices = await initORM();
    const { orm } = await initORM();
    const handlerOpts: ModalHandlerOptions<CTASelectData> = {
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
      callerId: <string>req.body.member?.user.id,
      data,
    };
  };

  it('should open the days modal when activating a reminder', async () => {
    const { handlerOpts } = await makeOpts('on');

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'remindOn' },
        }),
        title: t('remind.modal.days.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('remind.modal.days.label'),
            description: t('remind.modal.days.description'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'days',
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 2,
              required: true,
            },
          },
        ],
      },
    });
  });

  it('should refuse activation on an archived thread', async () => {
    const { handlerOpts, em, thread_id } = await makeOpts('on');
    usePublicThread(handlerOpts.req.body.channel, true);

    const response = await remindMenu.handler(handlerOpts);

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

  it('should refuse activation when a reminder already exists', async () => {
    const { handlerOpts, em, guild_id, thread_id } = await makeOpts('on');
    const guild = new DiscordGuild(guild_id);
    const existing = new ThreadRemind(thread_id, randomDiscordId19(), 5);
    existing.server = guild;
    await em.persist([guild, existing]).flush();

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.on.alreadyExists'),
        components: [],
      },
    });
  });

  it('should refuse outside a thread', async () => {
    const { handlerOpts } = await makeOpts('status');
    if (handlerOpts.req.body.channel) {
      handlerOpts.req.body.channel.type = ChannelType.GuildText;
    }

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.on.notThread'),
        components: [],
      },
    });
  });

  it('should report inactive when no reminder exists', async () => {
    const { handlerOpts } = await makeOpts('status');

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.status.inactive'),
        components: [],
      },
    });
  });

  it('should report active reminder with days and owner', async () => {
    const { handlerOpts, em, guild_id, thread_id } = await makeOpts('status');
    const ownerId = randomDiscordId19();
    const guild = new DiscordGuild(guild_id);
    const remind = new ThreadRemind(thread_id, ownerId, 7);
    remind.server = guild;
    await em.persist([guild, remind]).flush();

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.status.active', { days: 7, ownerId }),
        components: [],
      },
    });
  });

  it('should allow the owner to turn off and delete the last bump', async () => {
    const { handlerOpts, em, guild_id, thread_id, callerId } = await makeOpts(
      'off',
      default_member_permissions,
    );
    const previousBumpId = randomDiscordId19();
    const guild = new DiscordGuild(guild_id);
    const remind = new ThreadRemind(thread_id, callerId, 2);
    remind.server = guild;
    remind.lastBumpMessageId = previousBumpId;
    await em.persist([guild, remind]).flush();

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.delete,
        fullRoute: Routes.channelMessage(thread_id, previousBumpId),
      },
      undefined,
    );
    const deleteSpy = vi.spyOn(REST.prototype, 'delete');

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.off.success'),
        components: [],
      },
    });
    expect(deleteSpy).toHaveBeenCalledWith(
      Routes.channelMessage(thread_id, previousBumpId),
    );

    em.clear();
    expect(await em.findOne(ThreadRemind, { threadId: thread_id })).toBeNull();
  });

  it('should allow a moderator to turn off', async () => {
    const { handlerOpts, em, guild_id, thread_id, callerId } = await makeOpts(
      'off',
      admin_permissions,
    );
    const guild = new DiscordGuild(guild_id);
    const remind = new ThreadRemind(thread_id, randomDiscordId19(), 2);
    remind.server = guild;
    await em.persist([guild, remind]).flush();

    expect(callerId).not.toBe(remind.ownerUserId);

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('remind.off.success'),
        components: [],
      },
    });

    em.clear();
    expect(await em.findOne(ThreadRemind, { threadId: thread_id })).toBeNull();
  });

  it('should refuse a non-owner non-moderator', async () => {
    const { handlerOpts, em, guild_id, thread_id } = await makeOpts(
      'off',
      default_member_permissions,
    );
    const guild = new DiscordGuild(guild_id);
    const remind = new ThreadRemind(thread_id, randomDiscordId19(), 2);
    remind.server = guild;
    await em.persist([guild, remind]).flush();

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('common.notAllowed'),
        components: [],
      },
    });
  });

  it('should return not found when no reminder exists', async () => {
    const { handlerOpts } = await makeOpts('off', default_member_permissions);

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('common.notFound'),
        components: [],
      },
    });
  });

  it('should return invalid payload for an unknown action', async () => {
    const { handlerOpts } = await makeOpts('nope');

    const response = await remindMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(400, {
      error: t('errors.invalidSubcommandPayload'),
      issues: [
        {
          code: 'invalid_value',
          values: ['on', 'status', 'off'],
          path: ['action'],
          message: 'Invalid option: expected one of "on"|"status"|"off"',
        },
      ],
    });
  });
});
