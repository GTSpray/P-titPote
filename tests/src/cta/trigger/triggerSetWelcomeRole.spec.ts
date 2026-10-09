import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { triggerSetWelcomeRole } from '../../../../src/commands/cta/trigger/triggerSetWelcomeRole.js';
import {
  CTAData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionModalHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
  Routes,
} from 'discord-api-types/v10';
import { GuildTrigger } from '../../../../src/db/entities/GuildTrigger.entity.js';
import { expectedGuildTrigger } from '../../../epectedEntities/expectedGuildTrigger.js';
import { expectedTriggerRole } from '../../../epectedEntities/expectedTriggerRole.js';
import {
  getModalLabelComponnents,
  PartialComponentList,
  PartialComponentSingle,
} from '../../../helpers/getModalLabelComponnents.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';
import {
  DiscrodRESTMock,
  DiscrodRESTMockVerb,
} from '../../../mocks/discordjs.js';

describe('cta/triggerSetWelcomeRole', () => {
  let guild_id: string;
  let role_id: string;
  let bot_role_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let data: CTAData;
  let nameCmp: PartialComponentSingle;
  let roleCmp: PartialComponentList;
  const previousAppId = process.env.APP_ID;

  const mockAssignableRole = () => {
    const botUserId = process.env.APP_ID ?? randomDiscordId19();
    process.env.APP_ID = botUserId;
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guildRoles(guild_id),
      },
      [
        {
          id: guild_id,
          name: '@everyone',
          position: 0,
          permissions: '0',
          managed: false,
        },
        {
          id: role_id,
          name: 'Member',
          position: 1,
          permissions: '0',
          managed: false,
        },
        {
          id: bot_role_id,
          name: 'Bot',
          position: 5,
          permissions: `${PermissionFlagsBits.ManageRoles}`,
          managed: false,
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guildMember(guild_id, botUserId),
      },
      {
        roles: [bot_role_id],
        user: { id: botUserId },
      },
    );
  };

  beforeEach(async () => {
    DiscrodRESTMock.clear();
    role_id = randomDiscordId19();
    bot_role_id = randomDiscordId19();
    nameCmp = {
      custom_id: 'name',
      type: ComponentType.TextInput,
      value: 'member',
    };
    roleCmp = {
      custom_id: 'role',
      type: ComponentType.RoleSelect,
      values: [role_id],
    };

    data = {
      components: getModalLabelComponnents([nameCmp, roleCmp]),
      custom_id: `{"t":"cta","d":{"a":"triggerSetWelcomeRole"}}`,
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

  afterEach(() => {
    process.env.APP_ID = previousAppId;
  });

  it('should create welcome role trigger', async () => {
    mockAssignableRole();
    const response = await triggerSetWelcomeRole.handler(handlerOpts);

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

    em.clear();
    const saved = await em.findOne(
      GuildTrigger,
      {
        server: { guildId: guild_id },
        name: 'member',
      },
      { populate: ['messageConfig', 'roleConfig'] },
    );
    expect(saved).toEqual(
      expectedGuildTrigger({
        name: 'member',
        kind: 'welcome_role',
        enabled: true,
        messageConfig: null,
        roleConfig: expectedTriggerRole({
          roleId: role_id,
        }),
      }),
    );
  });

  it('should refuse when bot role is below target role', async () => {
    const botUserId = randomDiscordId19();
    process.env.APP_ID = botUserId;
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guildRoles(guild_id),
      },
      [
        {
          id: guild_id,
          name: '@everyone',
          position: 0,
          permissions: '0',
          managed: false,
        },
        {
          id: role_id,
          name: 'Member',
          position: 10,
          permissions: '0',
          managed: false,
        },
        {
          id: bot_role_id,
          name: 'Bot',
          position: 2,
          permissions: `${PermissionFlagsBits.ManageRoles}`,
          managed: false,
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guildMember(guild_id, botUserId),
      },
      {
        roles: [bot_role_id],
        user: { id: botUserId },
      },
    );

    const response = await triggerSetWelcomeRole.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.role.hierarchy'),
      },
    });
  });

  it('should refuse non-moderators', async () => {
    const { req, res } = getInteractionModalHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await triggerSetWelcomeRole.handler({
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
});
