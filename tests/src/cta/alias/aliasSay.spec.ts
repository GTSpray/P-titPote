import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { aliasSay } from '../../../../src/commands/cta/alias/aliasSay.js';
import {
  CTAData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionModalHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import {
  getRandomString,
  randomDiscordId19,
} from '../../../mocks/discord-api/utils.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { MessageAliased } from '../../../../src/db/entities/MessageAliased.entity.js';
import {
  getModalLabelComponnents,
  PartialComponentList,
} from '../../../helpers/getModalLabelComponnents.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/aliasSay', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let data: CTAData;
  let aliasCmp: PartialComponentList;
  let messageAliased: MessageAliased;

  beforeEach(async () => {
    aliasCmp = {
      custom_id: 'alias',
      type: ComponentType.StringSelect,
      values: ['welcome'],
    };

    data = {
      components: getModalLabelComponnents([aliasCmp]),
      custom_id: `{"t":"cta","d":{"a":"aliasSay"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({
      data,
      permissions: admin_permissions,
    });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };
    guild_id = <string>req.body.guild_id;
    const { orm } = await initORM();
    em = orm.em.fork();

    const guild = new DiscordGuild(guild_id);
    messageAliased = new MessageAliased(
      'welcome',
      'an example of aliased message content',
    );
    guild.messageAliaseds.add(messageAliased);
    await em.persist(guild).persist(messageAliased).flush();
  });

  it('should respond with aliased message content', async () => {
    const response = await aliasSay.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: messageAliased.message,
          },
        ],
      },
    });
  });

  it('should display a temporary message indicating that the command cannot be executed if the user is not a moderator', async () => {
    const { req, res } = getInteractionModalHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await aliasSay.handler({
      ...handlerOpts,
      req,
      res,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notAllowed'),
      },
    });
  });

  it('should not respond with aliased message content of another guild', async () => {
    const { req, res } = getInteractionModalHttpMock({
      guild_id: randomDiscordId19(),
      data,
      permissions: admin_permissions,
    });
    const response = await aliasSay.handler({
      ...handlerOpts,
      req,
      res,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('alias.say.notFound', {
          alias: 'welcome',
        }),
      },
    });
  });

  it.each([
    [
      'too_small',
      {
        inclusive: true,
        message: 'Too small: expected string to have >=1 characters',
        minimum: 1,
        origin: 'string',
        path: ['alias'],
      },
      '',
    ],
    [
      'invalid_format',
      {
        format: 'regex',
        message: 'Invalid string: must match pattern /^[a-z0-9]+$/',
        origin: 'string',
        path: ['alias'],
        pattern: '/^[a-z0-9]+$/',
      },
      '#@!ù',
    ],
    [
      'too_big',
      {
        inclusive: true,
        maximum: 50,
        message: 'Too big: expected string to have <=50 characters',
        origin: 'string',
        path: ['alias'],
      },
      getRandomString({ length: 51, letter: true, number: false }),
    ],
  ])('should respond error on %s "alias"', async (code, issue, badAlias) => {
    const badData: CTAData = {
      components: getModalLabelComponnents([
        {
          custom_id: 'alias',
          type: ComponentType.StringSelect,
          values: [badAlias],
        },
      ]),
      custom_id: `{"t":"cta","d":{"a":"aliasSay"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({
      data: badData,
      permissions: admin_permissions,
    });

    const response = await aliasSay.handler({
      ...handlerOpts,
      req,
      res,
      additionalData: JSON.parse(badData.custom_id),
    });

    expect(response).toMeetApiResponse(400, {
      error: t('errors.invalidSubcommandPayload'),
      issues: expect.arrayContaining([
        {
          code,
          ...issue,
        },
      ]),
    });
  });
});
