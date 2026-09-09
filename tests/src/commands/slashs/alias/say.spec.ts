import {
  aliasSayCommandData,
  aliasSaySubCommandData,
  say,
} from '../../../../../src/commands/slash/alias/say.js';
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
import { t } from '../../../../../src/i18n/index.js';

describe('/alias say', () => {
  let guild_id: string;
  let handlerOpts: CommandHandlerOptions<aliasSayCommandData>;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;

  const subcommand: aliasSaySubCommandData = {
    name: 'say',
    options: [],
    type: 1,
  };

  const data: aliasSayCommandData = {
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
    const response = await say(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notFound'),
      },
    });
  });

  it('should respond with say modal listing current aliases', async () => {
    const guild = new DiscordGuild(guild_id);
    const welcome = new MessageAliased('welcome', 'Bienvenue');
    const rules = new MessageAliased('rules', 'Règles du serveur');
    guild.messageAliaseds.add(welcome);
    guild.messageAliaseds.add(rules);
    await em.persist(guild).flush();

    const response = await say(handlerOpts, subcommand);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'aliasSay' },
        }),
        title: t('alias.modal.say.title'),
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
});
