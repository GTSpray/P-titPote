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

describe('cta/triggerSetWelcomeRole', () => {
  let guild_id: string;
  let role_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let data: CTAData;
  let nameCmp: PartialComponentSingle;
  let roleCmp: PartialComponentList;

  beforeEach(async () => {
    role_id = randomDiscordId19();
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

  it('should create welcome role trigger', async () => {
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
