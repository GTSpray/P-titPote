import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { trigUpdateWelMsg } from '../../../../src/commands/cta/trigger/trigUpdateWelMsg.js';
import {
  CTAData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionModalHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import {
  GuildTrigger,
  GuildTriggerKind,
} from '../../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../../src/db/entities/TriggerMessage.entity.js';
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
import * as assertBotCanPostInChannelModule from '../../../../src/utils/assertBotCanPostInChannel.js';

const previewButton = (name: string) => ({
  type: ComponentType.ActionRow,
  components: [
    {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      label: t('trigger.lifecycle.previewButton'),
      custom_id: JSON.stringify({
        t: 'cta',
        d: { a: 'trigPreviewWelMsg', n: name },
      }),
    },
  ],
});

describe('cta/trigUpdateWelMsg', () => {
  let guild_id: string;
  let channel_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let data: CTAData;
  let channelCmp: PartialComponentList;
  let messageCmp: PartialComponentSingle;
  let existing: GuildTrigger;

  beforeEach(async () => {
    vi.spyOn(
      assertBotCanPostInChannelModule,
      'assertBotCanPostInChannel',
    ).mockResolvedValue(undefined);

    channel_id = randomDiscordId19();
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
      components: getModalLabelComponnents([channelCmp, messageCmp]),
      custom_id: `{"t":"cta","d":{"a":"trigUpdateWelMsg","n":"welcome"}}`,
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
    existing = new GuildTrigger('welcome', GuildTriggerKind.WelcomeMessage);
    existing.enabled = false;
    const messageConfig = new TriggerMessage(randomDiscordId19(), 'old');
    messageConfig.trigger = existing;
    existing.messageConfig = messageConfig;
    guild.triggers.add(existing);
    await em.persist(guild).flush();
  });

  it('should update the welcome message without changing enabled', async () => {
    const response = await trigUpdateWelMsg.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('trigger.lifecycle.updated', { name: 'welcome' }),
          },
          previewButton('welcome'),
        ],
      },
    });

    em.clear();
    const saved = await em.findOneOrFail(
      GuildTrigger,
      { id: existing.id },
      { populate: ['messageConfig', 'roleConfig'] },
    );
    expect(saved).toEqual(
      expectedGuildTrigger({
        name: 'welcome',
        kind: GuildTriggerKind.WelcomeMessage,
        enabled: false,
        messageConfig: expectedTriggerMessage({
          channelId: channel_id,
          message: 'Bienvenue {user} sur {server}',
        }),
        roleConfig: null,
      }),
    );
  });

  it('should refuse when the user is not a moderator', async () => {
    const { req, res } = getInteractionModalHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await trigUpdateWelMsg.handler({
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
