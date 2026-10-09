import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { triggerPick } from '../../../../src/commands/cta/trigger/triggerPick.js';
import { ModalHandlerOptions } from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionMessageComponentHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  TextInputStyle,
} from 'discord-api-types/v10';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { GuildTrigger } from '../../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../../src/db/entities/TriggerMessage.entity.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/triggerPick', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let trigger: GuildTrigger;
  let channelId: string;

  const makeOpts = async (act: string, name = 'welcome') => {
    const data = {
      custom_id: JSON.stringify({
        t: 'cta',
        d: { a: 'triggerPick', act },
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
    } satisfies ModalHandlerOptions<any>;
  };

  beforeEach(async () => {
    guild_id = randomDiscordId19();
    channelId = randomDiscordId19();
    const { orm } = await initORM();
    em = orm.em.fork();

    const guild = new DiscordGuild(guild_id);
    trigger = new GuildTrigger('welcome', 'welcome_message');
    const messageConfig = new TriggerMessage(channelId, 'Bienvenue {user}');
    messageConfig.trigger = trigger;
    trigger.messageConfig = messageConfig;
    guild.triggers.add(trigger);
    await em.persist(guild).flush();
  });

  it('should open update modal without name field', async () => {
    const handlerOpts = await makeOpts('update');
    const response = await triggerPick.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'tUpdMsg', n: 'welcome' },
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

  it('should disable trigger', async () => {
    const handlerOpts = await makeOpts('disable');
    const response = await triggerPick.handler(handlerOpts);

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
    const saved = await em.findOne(GuildTrigger, { id: trigger.id });
    expect(saved?.enabled).toBe(false);
  });

  it('should enable trigger', async () => {
    trigger.enabled = false;
    await em.persist(trigger).flush();

    const handlerOpts = await makeOpts('enable');
    const response = await triggerPick.handler(handlerOpts);

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
    const saved = await em.findOne(GuildTrigger, { id: trigger.id });
    expect(saved?.enabled).toBe(true);
  });

  it('should soft-delete trigger', async () => {
    const handlerOpts = await makeOpts('delete');
    const response = await triggerPick.handler(handlerOpts);

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
    const saved = await em.findOne(
      GuildTrigger,
      { id: trigger.id },
      { filters: false },
    );
    expect(saved?.deletedAt).toBeInstanceOf(Date);
  });

  it('should refuse already disabled', async () => {
    trigger.enabled = false;
    await em.persist(trigger).flush();

    const handlerOpts = await makeOpts('disable');
    const response = await triggerPick.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.lifecycle.alreadyDisabled', { name: 'welcome' }),
      },
    });
  });

  it('should refuse non-moderators', async () => {
    const data = {
      custom_id: JSON.stringify({
        t: 'cta',
        d: { a: 'triggerPick', act: 'disable' },
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

    const response = await triggerPick.handler({
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
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
