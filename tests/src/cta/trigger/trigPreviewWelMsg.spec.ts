import { REST } from 'discord.js';
import {
  InteractionResponseType,
  MessageFlags,
  Routes,
} from 'discord-api-types/v10';
import { trigPreviewWelMsg } from '../../../../src/commands/cta/trigger/trigPreviewWelMsg.js';
import { initORM } from '../../../initORM.js';
import { getInteractionMessageComponentHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { GuildTrigger } from '../../../../src/db/entities/GuildTrigger.entity.js';
import { TriggerMessage } from '../../../../src/db/entities/TriggerMessage.entity.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';
import {
  DiscrodRESTMock,
  DiscrodRESTMockVerb,
} from '../../../mocks/discordjs.js';

describe('cta/trigPreviewWelMsg', () => {
  let guildId: string;
  let userId: string;

  beforeEach(() => {
    DiscrodRESTMock.clear();
    vi.spyOn(REST.prototype, 'get');
  });

  const setupTrigger = async (message: string) => {
    const dbServices = await initORM();
    const em = dbServices.orm.em.fork();
    const { req, res } = getInteractionMessageComponentHttpMock({
      data: {
        custom_id: '{"t":"cta","d":{"a":"trigPreviewWelMsg","n":"welcome"}}',
        component_type: 2,
        values: [],
      },
      permissions: admin_permissions,
    });
    guildId = req.body.guild_id!;
    userId = req.body.member!.user!.id;

    const guild = new DiscordGuild(guildId);
    const trigger = new GuildTrigger('welcome', 'welcome_message');
    const messageConfig = new TriggerMessage(randomDiscordId19(), message);
    messageConfig.trigger = trigger;
    trigger.messageConfig = messageConfig;
    guild.triggers.add(trigger);
    await em.persist(guild).flush();

    DiscrodRESTMock.register(
      { verb: DiscrodRESTMockVerb.get, fullRoute: Routes.guild(guildId) },
      { id: guildId, name: 'Serveur de démo' },
    );

    return {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(req.body.data!.custom_id),
    };
  };

  it('posts an interpolated preview for moderators', async () => {
    const opts = await setupTrigger('Bienvenue {user} sur {server}');

    const response = await trigPreviewWelMsg.handler(opts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Bienvenue <@${userId}> sur Serveur de démo`,
      },
    });
  });

  it('refuses non-moderators', async () => {
    const { req, res } = getInteractionMessageComponentHttpMock({
      data: {
        custom_id: '{"t":"cta","d":{"a":"trigPreviewWelMsg","n":"welcome"}}',
        component_type: 2,
        values: [],
      },
      permissions: default_member_permissions,
    });

    const response = await trigPreviewWelMsg.handler({
      req,
      res,
      dbServices: await initORM(),
      additionalData: JSON.parse(req.body.data!.custom_id),
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notAllowed'),
      },
    });
  });

  it('returns not found when the trigger is missing', async () => {
    const dbServices = await initORM();
    const { req, res } = getInteractionMessageComponentHttpMock({
      data: {
        custom_id: '{"t":"cta","d":{"a":"trigPreviewWelMsg","n":"missing"}}',
        component_type: 2,
        values: [],
      },
      permissions: admin_permissions,
    });

    const response = await trigPreviewWelMsg.handler({
      req,
      res,
      dbServices,
      additionalData: JSON.parse(req.body.data!.custom_id),
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.lifecycle.notFound', { name: 'missing' }),
      },
    });
  });

  it('returns not found when the trigger was soft-deleted', async () => {
    const opts = await setupTrigger('Bienvenue {user}');
    const em = opts.dbServices.orm.em.fork();
    const trigger = await em.findOneOrFail(GuildTrigger, {
      server: { guildId },
      name: 'welcome',
    });
    trigger.deletedAt = new Date();
    await em.persist(trigger).flush();
    em.clear();

    const response = await trigPreviewWelMsg.handler(opts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('trigger.lifecycle.notFound', { name: 'welcome' }),
      },
    });
  });
});
