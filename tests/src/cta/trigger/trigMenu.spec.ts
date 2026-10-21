import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { trigMenu } from '../../../../src/commands/cta/trigger/trigMenu.js';
import {
  CTASelectData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionMessageComponentHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import { ComponentType, InteractionResponseType } from 'discord-api-types/v10';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import {
  GuildTrigger,
  GuildTriggerKind,
} from '../../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../../src/db/entities/TriggerMessage.entity.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/trigMenu', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<CTASelectData>;

  const makeOpts = async (
    action: string,
  ): Promise<ModalHandlerOptions<CTASelectData> & { data: CTASelectData }> => {
    const data: CTASelectData = {
      custom_id: `{"t":"cta","d":{"a":"trigMenu"}}`,
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

  it('should show the kind select when creating a trigger', async () => {
    const response = await trigMenu.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('trigger.menu.selectedChoice', {
          choice: t('trigger.action.create'),
          next: t('trigger.create.chooseKind'),
        }),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'trigSetType' },
                }),
                placeholder: t('trigger.modal.select.kind.placeholder'),
                options: [
                  {
                    label: t('trigger.kind.welcome_message'),
                    value: GuildTriggerKind.WelcomeMessage,
                  },
                  {
                    label: t('trigger.kind.welcome_role'),
                    value: GuildTriggerKind.WelcomeRole,
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('should show the trigger pick when disabling a trigger', async () => {
    const guild = new DiscordGuild(guild_id);
    const trigger = new GuildTrigger(
      'welcome',
      GuildTriggerKind.WelcomeMessage,
    );
    const messageConfig = new TriggerMessage(randomDiscordId19(), 'hi');
    messageConfig.trigger = trigger;
    trigger.messageConfig = messageConfig;
    guild.triggers.add(trigger);
    await em.persist(guild).flush();

    const opts = await makeOpts('disable');
    opts.req.body.guild_id = guild_id;
    const response = await trigMenu.handler({
      req: opts.req,
      res: opts.res,
      dbServices: opts.dbServices,
      additionalData: opts.additionalData,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('trigger.menu.selectedChoice', {
          choice: t('trigger.action.disable'),
          next: t('trigger.lifecycle.chooseTrigger'),
        }),
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.StringSelect,
                custom_id: JSON.stringify({
                  t: 'cta',
                  d: { a: 'trigPick', act: 'disable' },
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

  it('should show not found when updating with no triggers', async () => {
    const opts = await makeOpts('update');
    opts.req.body.guild_id = guild_id;
    const response = await trigMenu.handler({
      req: opts.req,
      res: opts.res,
      dbServices: opts.dbServices,
      additionalData: opts.additionalData,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('trigger.menu.selectedChoice', {
          choice: t('trigger.action.update'),
          next: t('common.notFound'),
        }),
        components: [],
      },
    });
  });

  it('should refuse when the user is not a moderator', async () => {
    const data: CTASelectData = {
      custom_id: `{"t":"cta","d":{"a":"trigMenu"}}`,
      component_type: ComponentType.StringSelect,
      values: ['create'],
    };
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await trigMenu.handler({
      ...handlerOpts,
      req,
      res,
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
