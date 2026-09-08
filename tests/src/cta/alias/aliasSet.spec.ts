import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
  QueryOrder,
} from '@mikro-orm/mariadb';
import { aliasSet } from '../../../../src/commands/cta/alias/aliasSet.js';
import {
  CTAData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionModalHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { expectedDiscordGuild } from '../../../epectedEntities/expectedDiscordGuild.js';
import {
  getRandomString,
  randomDiscordId19,
} from '../../../mocks/discord-api/utils.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { expectedMessageAliased } from '../../../epectedEntities/expectedMessageAliased.js';
import { MessageAliased } from '../../../../src/db/entities/MessageAliased.entity.js';
import {
  getModalLabelComponnents,
  PartialComponentSingle,
} from '../../../helpers/getModalLabelComponnents.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/aliasSet', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let data: CTAData;
  let aliasCmp: PartialComponentSingle;
  let messageCmp: PartialComponentSingle;

  beforeEach(async () => {
    aliasCmp = {
      custom_id: 'alias',
      type: ComponentType.TextInput,
      value: 'welcome',
    };
    messageCmp = {
      custom_id: 'message',
      type: ComponentType.TextInput,
      value: "Bienvenue sur le serveur de test de p'tit pote !!!!",
    };

    data = {
      components: getModalLabelComponnents([aliasCmp, messageCmp]),
      custom_id: `{"t":"cta","d":{"a":"aliasSet"}}`,
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
  });

  it('should respond success message', async () => {
    const response = await aliasSet.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('common.ok'),
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

    const response = await aliasSet.handler({
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

  it('should save discord server', async () => {
    await aliasSet.handler(handlerOpts);

    em.clear();
    const server = await em.findOneOrFail(DiscordGuild, {
      guildId: guild_id,
    });

    expect(server).toEqual(
      expectedDiscordGuild({
        guildId: guild_id,
      }),
    );
  });

  it('should save aliased message', async () => {
    await aliasSet.handler(handlerOpts);

    em.clear();
    const msgs = await em.findAll(MessageAliased, {
      where: { server: { guildId: guild_id } },
    });
    expect(msgs).toEqual([
      expectedMessageAliased({
        alias: aliasCmp.value,
        message: messageCmp.value,
      }),
    ]);
  });

  describe('on existing server', () => {
    let guild: DiscordGuild;
    beforeEach(async () => {
      guild = new DiscordGuild(guild_id);
      await em.persist(guild).flush();
    });

    it('should not duplicate discord server', async () => {
      await aliasSet.handler(handlerOpts);

      em.clear();

      const servers = await em.findAll(DiscordGuild, {
        where: { guildId: guild_id },
      });

      expect(servers).toEqual([
        expectedDiscordGuild({
          guildId: guild_id,
        }),
      ]);
    });

    describe('on existing aliased message', () => {
      let messageAliased: MessageAliased;
      beforeEach(async () => {
        messageAliased = new MessageAliased(aliasCmp.value, 'old message');
        guild.messageAliaseds.add(messageAliased);
        await em.persist(guild).persist(messageAliased).flush();
      });

      it('should not create duplicate aliased message', async () => {
        await aliasSet.handler(handlerOpts);

        em.clear();

        const msgs = await em.findAll(MessageAliased, {
          where: { server: { guildId: guild_id } },
        });
        expect(msgs).toBeArrayOfSize(1);
      });

      it('should update existing aliased message', async () => {
        await aliasSet.handler(handlerOpts);

        em.clear();

        const msg = await em.findOneOrFail(MessageAliased, {
          id: messageAliased.id,
        });

        expect(msg).toEqual(
          expectedMessageAliased({
            message: messageCmp.value,
          }),
        );
      });

      it('should allow to create another aliased message on this server', async () => {
        const anotherAliasCmp: PartialComponentSingle = {
          custom_id: 'alias',
          type: ComponentType.TextInput,
          value: 'anotheralias',
        };
        const anotherData: CTAData = {
          components: getModalLabelComponnents([anotherAliasCmp, messageCmp]),
          custom_id: `{"t":"cta","d":{"a":"aliasSet"}}`,
        };
        const { req, res } = getInteractionModalHttpMock({
          guild_id,
          data: anotherData,
          permissions: admin_permissions,
        });

        await aliasSet.handler({
          ...handlerOpts,
          req,
          res,
          additionalData: JSON.parse(anotherData.custom_id),
        });

        em.clear();

        const msgs = await em.findAll(MessageAliased, {
          where: { server: { guildId: guild_id } },
          orderBy: { alias: QueryOrder.ASC },
        });

        expect(msgs).toEqual([
          expectedMessageAliased({
            alias: anotherAliasCmp.value,
            message: messageCmp.value,
          }),
          expectedMessageAliased({
            alias: messageAliased.alias,
            message: messageAliased.message,
          }),
        ]);
      });
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
          type: ComponentType.TextInput,
          value: badAlias,
        },
        messageCmp,
      ]),
      custom_id: `{"t":"cta","d":{"a":"aliasSet"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({
      data: badData,
      permissions: admin_permissions,
    });

    const response = await aliasSet.handler({
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

  it.each([
    [
      'too_small',
      {
        inclusive: true,
        message: 'Too small: expected string to have >=1 characters',
        minimum: 1,
        origin: 'string',
        path: ['message'],
      },
      '',
    ],
    [
      'too_big',
      {
        inclusive: true,
        maximum: 500,
        message: 'Too big: expected string to have <=500 characters',
        origin: 'string',
        path: ['message'],
      },
      getRandomString({ length: 501, letter: true, number: false }),
    ],
  ])(
    'should respond error on %s "message"',
    async (code, issue, badMessage) => {
      const badData: CTAData = {
        components: getModalLabelComponnents([
          aliasCmp,
          {
            custom_id: 'message',
            type: ComponentType.TextInput,
            value: badMessage,
          },
        ]),
        custom_id: `{"t":"cta","d":{"a":"aliasSet"}}`,
      };
      const { req, res } = getInteractionModalHttpMock({
        data: badData,
        permissions: admin_permissions,
      });

      const response = await aliasSet.handler({
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
    },
  );
});
