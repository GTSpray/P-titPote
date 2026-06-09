import {
  pollCreateCommandData,
  pollCreateSubCommandData,
  create,
} from '../../../../../src/commands/slash/poll/create.js';
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
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
import {
  admin_permissions,
  default_member_permissions,
} from '../../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../../src/i18n/index.js';

describe('/poll create', () => {
  let guild_id: string;
  let handlerOpts: CommandHandlerOptions<pollCreateCommandData>;

  const subcommand: pollCreateSubCommandData = {
    name: 'create',
    options: [],
    type: 1,
  };

  const data: pollCreateCommandData = {
    id: randomDiscordId19(),
    name: 'poll',
    options: [subcommand],
    type: 1,
  };

  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  beforeEach(async () => {
    const { req, res } = getInteractionCommandHttpMock({
      data,
      permissions: admin_permissions,
    });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
    };

    guild_id = <string>req.body.guild_id;
    const { orm } = await initORM();
    em = orm.em.fork();
  });

  it('should respond success message', async () => {
    const response = await create(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'pollCreate' },
        }),
        title: t('poll.modal.create.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('poll.modal.label.title'),
            component: {
              type: ComponentType.TextInput,
              custom_id: `title`,
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 45,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t('poll.modal.label.role'),
            component: {
              type: ComponentType.RoleSelect,
              custom_id: `role`,
              required: false,
            },
          },
          {
            type: ComponentType.Label,
            label: t('poll.modal.label.question'),
            component: {
              type: ComponentType.TextInput,
              custom_id: `question`,
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 45,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t('poll.modal.label.description'),
            component: {
              type: ComponentType.TextInput,
              custom_id: `description`,
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 100,
              required: false,
            },
          },
          {
            type: ComponentType.Label,
            label: t('poll.modal.label.endDate'),
            description: t('poll.modal.description.endDate'),
            component: {
              type: ComponentType.TextInput,
              custom_id: `endDate`,
              style: TextInputStyle.Short,
              min_length: 10,
              max_length: 16,
              placeholder: '2026-06-30 18:00',
              required: true,
            },
          },
        ],
      },
    });
  });

  it('should display a temporary message indicating that the command cannot be executed if the user is not a moderator', async () => {
    const { req, res } = getInteractionCommandHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await create(
      {
        ...handlerOpts,
        req,
        res,
      },
      subcommand,
    );

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notAllowed'),
      },
    });
  });
});
