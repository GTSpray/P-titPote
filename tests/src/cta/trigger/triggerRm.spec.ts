import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { triggerRm } from '../../../../src/commands/cta/trigger/triggerRm.js';
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
import { GuildTrigger } from '../../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../../src/db/entities/TriggerMessage.entity.js';
import {
  getModalLabelComponnents,
  PartialComponentList,
} from '../../../helpers/getModalLabelComponnents.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/triggerRm', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let data: CTAData;
  let triggerCmp: PartialComponentList;
  let actionCmp: PartialComponentList;
  let trigger: GuildTrigger;

  beforeEach(async () => {
    triggerCmp = {
      custom_id: 'trigger',
      type: ComponentType.StringSelect,
      values: ['welcome'],
    };
    actionCmp = {
      custom_id: 'action',
      type: ComponentType.StringSelect,
      values: ['disable'],
    };

    data = {
      components: getModalLabelComponnents([triggerCmp, actionCmp]),
      custom_id: `{"t":"cta","d":{"a":"triggerRm"}}`,
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
    trigger = new GuildTrigger('welcome', 'welcome_message');
    const messageConfig = new TriggerMessage(randomDiscordId19(), 'hi');
    messageConfig.trigger = trigger;
    trigger.messageConfig = messageConfig;
    guild.triggers.add(trigger);
    await em.persist(guild).flush();
  });

  it('should disable trigger', async () => {
    const response = await triggerRm.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('trigger.rm.disabled', { name: 'welcome' }),
          },
        ],
      },
    });

    em.clear();
    const saved = await em.findOne(GuildTrigger, { id: trigger.id });
    expect(saved?.enabled).toBe(false);
  });

  it('should re-enable a disabled trigger', async () => {
    trigger.enabled = false;
    await em.persist(trigger).flush();
    actionCmp.values = ['enable'];
    data.components = getModalLabelComponnents([triggerCmp, actionCmp]);

    const response = await triggerRm.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('trigger.rm.enabled', { name: 'welcome' }),
          },
        ],
      },
    });

    em.clear();
    const saved = await em.findOne(GuildTrigger, { id: trigger.id });
    expect(saved?.enabled).toBe(true);
  });

  it('should soft-delete trigger', async () => {
    actionCmp.values = ['delete'];
    data.components = getModalLabelComponnents([triggerCmp, actionCmp]);

    const response = await triggerRm.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('trigger.rm.deleted', { name: 'welcome' }),
          },
        ],
      },
    });

    em.clear();
    const active = await em.findOne(GuildTrigger, { id: trigger.id });
    expect(active).toBeNull();
  });

  it('should refuse disable when already disabled', async () => {
    trigger.enabled = false;
    await em.persist(trigger).flush();

    const response = await triggerRm.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.rm.alreadyDisabled', { name: 'welcome' }),
      },
    });
  });

  it('should refuse enable when already enabled', async () => {
    actionCmp.values = ['enable'];
    data.components = getModalLabelComponnents([triggerCmp, actionCmp]);

    const response = await triggerRm.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.rm.alreadyEnabled', { name: 'welcome' }),
      },
    });
  });

  it('should refuse non-moderators', async () => {
    const { req, res } = getInteractionModalHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await triggerRm.handler({
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
