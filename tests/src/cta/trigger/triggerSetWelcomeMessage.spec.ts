import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { triggerSetWelcomeMessage } from '../../../../src/commands/cta/trigger/triggerSetWelcomeMessage.js';
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
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import {
  GuildTrigger,
  TRIGGER_LIMIT,
} from '../../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../../src/db/entities/TriggerMessage.entity.js';
import { TriggerRole } from '../../../../src/db/entities/TriggerRole.entity.js';
import { expectedGuildTrigger } from '../../../epectedEntities/expectedGuildTrigger.js';
import { expectedTriggerMessage } from '../../../epectedEntities/expectedTriggerMessage.js';
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

describe('cta/triggerSetWelcomeMessage', () => {
  let guild_id: string;
  let channel_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let data: CTAData;
  let nameCmp: PartialComponentSingle;
  let channelCmp: PartialComponentList;
  let messageCmp: PartialComponentSingle;

  beforeEach(async () => {
    channel_id = randomDiscordId19();
    nameCmp = {
      custom_id: 'name',
      type: ComponentType.TextInput,
      value: 'welcome',
    };
    channelCmp = {
      custom_id: 'channel',
      type: ComponentType.ChannelSelect,
      values: [channel_id],
    };
    messageCmp = {
      custom_id: 'message',
      type: ComponentType.TextInput,
      value: 'Bienvenue {user} sur {server}',
    };

    data = {
      components: getModalLabelComponnents([nameCmp, channelCmp, messageCmp]),
      custom_id: `{"t":"cta","d":{"a":"triggerSetWelcomeMessage"}}`,
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

  it('should create welcome message trigger', async () => {
    const response = await triggerSetWelcomeMessage.handler(handlerOpts);

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
        name: 'welcome',
      },
      { populate: ['messageConfig', 'roleConfig'] },
    );
    expect(saved).toEqual(
      expectedGuildTrigger({
        name: 'welcome',
        kind: 'welcome_message',
        enabled: true,
        messageConfig: expectedTriggerMessage({
          channelId: channel_id,
          message: 'Bienvenue {user} sur {server}',
        }),
        roleConfig: null,
      }),
    );
  });

  it('should refuse create when name already exists', async () => {
    const guild = new DiscordGuild(guild_id);
    const existing = new GuildTrigger('welcome', 'welcome_role');
    const roleConfig = new TriggerRole(randomDiscordId19());
    roleConfig.trigger = existing;
    existing.roleConfig = roleConfig;
    guild.triggers.add(existing);
    await em.persist(guild).flush();

    const response = await triggerSetWelcomeMessage.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.create.nameTaken', { name: 'welcome' }),
      },
    });
  });

  it('should update existing welcome message without changing enabled', async () => {
    const guild = new DiscordGuild(guild_id);
    const existing = new GuildTrigger('welcome', 'welcome_message');
    existing.enabled = false;
    const messageConfig = new TriggerMessage(randomDiscordId19(), 'old');
    messageConfig.trigger = existing;
    existing.messageConfig = messageConfig;
    guild.triggers.add(existing);
    await em.persist(guild).flush();

    const updateData: CTAData = {
      components: getModalLabelComponnents([channelCmp, messageCmp]),
      custom_id: `{"t":"cta","d":{"a":"tUpdMsg","n":"welcome"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({
      data: updateData,
      permissions: admin_permissions,
    });
    req.body.guild_id = guild_id;

    const response = await triggerSetWelcomeMessage.handler({
      req,
      res,
      dbServices: handlerOpts.dbServices,
      additionalData: JSON.parse(updateData.custom_id),
    });

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
      { id: existing.id },
      { populate: ['messageConfig'] },
    );
    expect(saved?.enabled).toBe(false);
    expect(saved?.messageConfig?.channelId).toBe(channel_id);
    expect(saved?.messageConfig?.message).toBe('Bienvenue {user} sur {server}');
  });

  it('should refuse when creating beyond limit', async () => {
    const guild = new DiscordGuild(guild_id);
    for (let i = 0; i < TRIGGER_LIMIT; i++) {
      const trigger = new GuildTrigger(`t${i}`, 'welcome_role');
      const roleConfig = new TriggerRole(randomDiscordId19());
      roleConfig.trigger = trigger;
      trigger.roleConfig = roleConfig;
      guild.triggers.add(trigger);
    }
    await em.persist(guild).flush();

    const response = await triggerSetWelcomeMessage.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('errors.tooMany'),
      },
    });
  });

  it('should refuse non-moderators', async () => {
    const { req, res } = getInteractionModalHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await triggerSetWelcomeMessage.handler({
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
