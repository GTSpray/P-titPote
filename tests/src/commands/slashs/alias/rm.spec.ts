import {
  aliasRmCommandData,
  aliasRmSubCommandData,
  rm,
} from '../../../../../src/commands/slash/alias/rm.js';
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
import { MessageAliased } from '../../../../../src/db/entities/MessageAliased.entity.js';
import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { ALIAS_SELECT_LIMIT } from '../../../../../src/commands/slash/alias/openAliasSelectModal.js';
import { t } from '../../../../../src/i18n/index.js';

describe('/alias rm', () => {
  let guild_id: string;
  let handlerOpts: CommandHandlerOptions<aliasRmCommandData>;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  const subcommand: aliasRmSubCommandData = {
    name: 'rm',
    options: [],
    type: 1,
  };

  const data: aliasRmCommandData = {
    id: randomDiscordId19(),
    name: 'alias',
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

  it('should respond not found when no aliases exist', async () => {
    const response = await rm(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notFound'),
      },
    });
  });

  it('should respond with rm modal listing current aliases', async () => {
    const guild = new DiscordGuild(guild_id);
    const welcome = new MessageAliased('welcome', 'Bienvenue');
    const rules = new MessageAliased('rules', 'Règles du serveur');
    guild.messageAliaseds.add(welcome);
    guild.messageAliaseds.add(rules);
    await em.persist(guild).flush();

    const response = await rm(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'aliasRm' },
        }),
        title: t('alias.modal.rm.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('alias.modal.label.alias'),
            component: {
              type: ComponentType.StringSelect,
              custom_id: 'alias',
              placeholder: t('alias.modal.select.placeholder'),
              required: true,
              options: [
                { label: 'rules', value: 'rules' },
                { label: 'welcome', value: 'welcome' },
              ],
            },
          },
        ],
      },
    });
  });

  it('should respond too many when aliases exceed select limit', async () => {
    const guild = new DiscordGuild(guild_id);
    for (let i = 0; i < ALIAS_SELECT_LIMIT + 1; i++) {
      guild.messageAliaseds.add(
        new MessageAliased(`alias${String(i).padStart(2, '0')}`, `msg ${i}`),
      );
    }
    await em.persist(guild).flush();

    const response = await rm(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('errors.tooMany'),
      },
    });
  });
});
