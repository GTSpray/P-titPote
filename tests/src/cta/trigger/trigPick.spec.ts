import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { trigPick } from '../../../../src/commands/cta/trigger/trigPick.js';
import {
  CTASelectData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionMessageComponentHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  SelectMenuDefaultValueType,
  TextInputStyle,
} from 'discord-api-types/v10';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import {
  GuildTrigger,
  GuildTriggerKind,
} from '../../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../../src/db/entities/TriggerMessage.entity.js';
import { TriggerRole } from '../../../../src/db/entities/TriggerRole.entity.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/trigPick', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let trigger: GuildTrigger;
  let channelId: string;

  const makeOpts = async (
    act: string,
    name = 'welcome',
  ): Promise<ModalHandlerOptions<CTASelectData>> => {
    const data: CTASelectData = {
      custom_id: JSON.stringify({
        t: 'cta',
        d: { a: 'trigPick', act },
      }),
      component_type: ComponentType.StringSelect,
      values: [name],
    };
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions: admin_permissions,
    });
    req.body.guild_id = guild_id;
    const dbServices = await initORM();
    return {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };
  };

  beforeEach(async () => {
    guild_id = randomDiscordId19();
    channelId = randomDiscordId19();
    const { orm } = await initORM();
    em = orm.em.fork();

    const guild = new DiscordGuild(guild_id);
    trigger = new GuildTrigger('welcome', GuildTriggerKind.WelcomeMessage);
    const messageConfig = new TriggerMessage(channelId, 'Bienvenue {user}');
    messageConfig.trigger = trigger;
    trigger.messageConfig = messageConfig;
    guild.triggers.add(trigger);
    await em.persist(guild).flush();
  });

  it('should open the welcome-message update modal without a name field', async () => {
    const handlerOpts = await makeOpts('update');
    const response = await trigPick.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'trigSetWelMsg', n: 'welcome' },
        }),
        title: t('trigger.modal.config.welcome_message.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.channel'),
            component: {
              type: ComponentType.ChannelSelect,
              custom_id: 'channel',
              required: true,
              default_values: [
                {
                  id: channelId,
                  type: SelectMenuDefaultValueType.Channel,
                },
              ],
            },
          },
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.message'),
            description: t('trigger.modal.description.message'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'message',
              style: TextInputStyle.Paragraph,
              min_length: 1,
              max_length: 2000,
              required: true,
              value: 'Bienvenue {user}',
            },
          },
        ],
      },
    });
  });

  it('should open the welcome-role update modal when a role is already configured', async () => {
    const roleId = randomDiscordId19();
    const roleTrigger = new GuildTrigger(
      'member',
      GuildTriggerKind.WelcomeRole,
    );
    const roleConfig = new TriggerRole(roleId);
    roleConfig.trigger = roleTrigger;
    roleTrigger.roleConfig = roleConfig;
    const guild = await em.findOneOrFail(DiscordGuild, { guildId: guild_id });
    guild.triggers.add(roleTrigger);
    await em.persist(guild).flush();

    const handlerOpts = await makeOpts('update', 'member');
    const response = await trigPick.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'trigSetWelRole', n: 'member' },
        }),
        title: t('trigger.modal.config.welcome_role.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.role'),
            component: {
              type: ComponentType.RoleSelect,
              custom_id: 'role',
              required: true,
              default_values: [
                {
                  id: roleId,
                  type: SelectMenuDefaultValueType.Role,
                },
              ],
            },
          },
        ],
      },
    });
  });

  it('should disable the selected trigger', async () => {
    const handlerOpts = await makeOpts('disable');
    const response = await trigPick.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('trigger.lifecycle.disabled', { name: 'welcome' }),
          },
        ],
      },
    });

    em.clear();
    const saved = await em.findOneOrFail(GuildTrigger, { id: trigger.id });
    expect(saved.enabled).toBe(false);
  });

  it('should enable the selected trigger', async () => {
    trigger.enabled = false;
    await em.persist(trigger).flush();

    const handlerOpts = await makeOpts('enable');
    const response = await trigPick.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('trigger.lifecycle.enabled', { name: 'welcome' }),
          },
        ],
      },
    });

    em.clear();
    const saved = await em.findOneOrFail(GuildTrigger, { id: trigger.id });
    expect(saved.enabled).toBe(true);
  });

  it('should soft-delete the selected trigger', async () => {
    const handlerOpts = await makeOpts('delete');
    const now = new Date();
    const response = await trigPick.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('trigger.lifecycle.deleted', { name: 'welcome' }),
          },
        ],
      },
    });

    em.clear();
    const saved = await em.findOneOrFail(
      GuildTrigger,
      { id: trigger.id },
      { filters: false },
    );
    expect(saved.deletedAt).toBeDateCloseTo(now, 2000);
  });

  it('should refuse to disable when the trigger is already disabled', async () => {
    trigger.enabled = false;
    await em.persist(trigger).flush();

    const handlerOpts = await makeOpts('disable');
    const response = await trigPick.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('trigger.lifecycle.alreadyDisabled', { name: 'welcome' }),
        components: [],
      },
    });
  });

  it('should refuse when the user is not a moderator', async () => {
    const data: CTASelectData = {
      custom_id: JSON.stringify({
        t: 'cta',
        d: { a: 'trigPick', act: 'disable' },
      }),
      component_type: ComponentType.StringSelect,
      values: ['welcome'],
    };
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions: default_member_permissions,
    });
    req.body.guild_id = guild_id;
    const dbServices = await initORM();

    const response = await trigPick.handler({
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('common.notAllowed'),
        components: [],
      },
    });
  });
});
