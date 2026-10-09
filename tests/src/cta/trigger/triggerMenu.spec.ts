import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { triggerMenu } from '../../../../src/commands/cta/trigger/triggerMenu.js';
import { ModalHandlerOptions } from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionMessageComponentHttpMock } from '../../../mocks/getInteractionHttpMock.js';
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
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/triggerMenu', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;

  const makeOpts = async (action: string) => {
    const data = {
      custom_id: `{"t":"cta","d":{"a":"triggerMenu"}}`,
      component_type: ComponentType.StringSelect,
      values: [action],
    };
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions: admin_permissions,
    });
    const dbServices = await initORM();
    return {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
      data,
    };
  };

  beforeEach(async () => {
    const opts = await makeOpts('create');
    handlerOpts = {
      req: opts.req,
      res: opts.res,
      dbServices: opts.dbServices,
      additionalData: opts.additionalData,
    };
    guild_id = <string>opts.req.body.guild_id;
    const { orm } = await initORM();
    em = orm.em.fork();
  });

  it('should show kind select on create', async () => {
    const response = await triggerMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.create.chooseKind'),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'triggerSetType' },
                }),
                placeholder: t('trigger.modal.select.kind.placeholder'),
                options: [
                  {
                    label: t('trigger.kind.welcome_message'),
                    value: 'welcome_message',
                  },
                  {
                    label: t('trigger.kind.welcome_role'),
                    value: 'welcome_role',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('should show trigger pick on disable', async () => {
    const guild = new DiscordGuild(guild_id);
    const trigger = new GuildTrigger('welcome', 'welcome_message');
    const messageConfig = new TriggerMessage(randomDiscordId19(), 'hi');
    messageConfig.trigger = trigger;
    trigger.messageConfig = messageConfig;
    guild.triggers.add(trigger);
    await em.persist(guild).flush();

    const opts = await makeOpts('disable');
    opts.req.body.guild_id = guild_id;
    const response = await triggerMenu.handler({
      req: opts.req,
      res: opts.res,
      dbServices: opts.dbServices,
      additionalData: opts.additionalData,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.lifecycle.chooseTrigger'),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'triggerPick', act: 'disable' },
                }),
                placeholder: t('trigger.modal.select.trigger.placeholder'),
                options: [
                  {
                    label: 'welcome',
                    value: 'welcome',
                    description: `${t('trigger.kind.welcome_message')} — ${t('trigger.status.enabled')}`,
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('should notFound when no triggers for update', async () => {
    const opts = await makeOpts('update');
    opts.req.body.guild_id = guild_id;
    const response = await triggerMenu.handler({
      req: opts.req,
      res: opts.res,
      dbServices: opts.dbServices,
      additionalData: opts.additionalData,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notFound'),
      },
    });
  });

  it('should refuse non-moderators', async () => {
    const data = {
      custom_id: `{"t":"cta","d":{"a":"triggerMenu"}}`,
      component_type: ComponentType.StringSelect,
      values: ['create'],
    };
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await triggerMenu.handler({
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
