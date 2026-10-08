import {
  triggerRmCommandData,
  triggerRmSubCommandData,
  rm,
} from '../../../../../src/commands/slash/trigger/rm.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import { initORM } from '../../../../initORM.js';
import { DiscordGuild } from '../../../../../src/db/entities/DiscordGuild.entity.js';
import { GuildTrigger } from '../../../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../../../src/db/entities/TriggerMessage.entity.js';
import { TriggerRole } from '../../../../../src/db/entities/TriggerRole.entity.js';
import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { t } from '../../../../../src/i18n/index.js';

describe('/trigger rm', () => {
  let guild_id: string;
  let handlerOpts: CommandHandlerOptions<triggerRmCommandData>;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  const subcommand: triggerRmSubCommandData = {
    name: 'rm',
    options: [],
    type: 1,
  };

  const data: triggerRmCommandData = {
    id: randomDiscordId19(),
    name: 'trigger',
    options: [subcommand],
    type: 1,
  };

  beforeEach(async () => {
    const { req, res } = getInteractionCommandHttpMock({ data });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
    };
    guild_id = <string>req.body.guild_id;
    const { orm } = await initORM();
    em = orm.em.fork();
  });

  it('should respond not found when no triggers exist', async () => {
    const response = await rm(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notFound'),
      },
    });
  });

  it('should respond with rm modal listing triggers and actions', async () => {
    const guild = new DiscordGuild(guild_id);
    const welcome = new GuildTrigger('welcome', 'welcome_message');
    const messageConfig = new TriggerMessage(
      randomDiscordId19(),
      'Bienvenue {user}',
    );
    messageConfig.trigger = welcome;
    welcome.messageConfig = messageConfig;
    const role = new GuildTrigger('memberrole', 'welcome_role');
    const roleConfig = new TriggerRole(randomDiscordId19());
    roleConfig.trigger = role;
    role.roleConfig = roleConfig;
    role.enabled = false;
    guild.triggers.add(welcome);
    guild.triggers.add(role);
    await em.persist(guild).flush();

    const response = await rm(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'triggerRm' },
        }),
        title: t('trigger.modal.rm.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.trigger'),
            component: {
              type: ComponentType.StringSelect,
              custom_id: 'trigger',
              placeholder: t('trigger.modal.select.trigger.placeholder'),
              required: true,
              options: [
                {
                  label: 'memberrole',
                  value: 'memberrole',
                  description: `${t('trigger.kind.welcome_role')} — ${t('trigger.status.disabled')}`,
                },
                {
                  label: 'welcome',
                  value: 'welcome',
                  description: `${t('trigger.kind.welcome_message')} — ${t('trigger.status.enabled')}`,
                },
              ],
            },
          },
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.action'),
            component: {
              type: ComponentType.StringSelect,
              custom_id: 'action',
              placeholder: t('trigger.modal.select.action.placeholder'),
              required: true,
              options: [
                {
                  label: t('trigger.action.enable'),
                  value: 'enable',
                },
                {
                  label: t('trigger.action.disable'),
                  value: 'disable',
                },
                {
                  label: t('trigger.action.delete'),
                  value: 'delete',
                },
              ],
            },
          },
        ],
      },
    });
  });
});
