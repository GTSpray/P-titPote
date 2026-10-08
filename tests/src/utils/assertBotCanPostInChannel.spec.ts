import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
} from 'discord-api-types/v10';
import {
  assertBotCanPostInChannel,
  BotCannotPostInChannelError,
} from '../../../src/utils/assertBotCanPostInChannel.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';

describe('assertBotCanPostInChannel', () => {
  let guildId: string;
  let channelId: string;
  let botRoleId: string;
  const botUserId = process.env.APP_ID!;

  beforeEach(() => {
    DiscrodRESTMock.clear();
    guildId = randomDiscordId19();
    channelId = randomDiscordId19();
    botRoleId = randomDiscordId19();
  });

  const registerHappyPath = (opts?: {
    channelPermissions?: string;
    overwriteDeny?: string;
  }) => {
    const channelPermissions =
      opts?.channelPermissions ??
      `${PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages}`;

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      {
        id: channelId,
        type: ChannelType.GuildText,
        guild_id: guildId,
        name: 'welcome',
        permission_overwrites: opts?.overwriteDeny
          ? [
              {
                id: botRoleId,
                type: OverwriteType.Role,
                allow: '0',
                deny: opts.overwriteDeny,
              },
            ]
          : [],
      },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guildRoles(guildId),
      },
      [
        {
          id: guildId,
          name: '@everyone',
          position: 0,
          permissions: '0',
          managed: false,
        },
        {
          id: botRoleId,
          name: 'Bot',
          position: 5,
          permissions: channelPermissions,
          managed: false,
        },
      ],
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.guildMember(guildId, botUserId),
      },
      {
        roles: [botRoleId],
        user: { id: botUserId },
      },
    );
  };

  it('should resolve when bot can post in the channel', async () => {
    registerHappyPath();
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it('should reject when bot lacks View Channel', async () => {
    registerHappyPath({
      channelPermissions: `${PermissionFlagsBits.SendMessages}`,
    });
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({
      reason: 'missingViewChannel',
    } satisfies Partial<BotCannotPostInChannelError>);
  });

  it('should reject when bot lacks Send Messages', async () => {
    registerHappyPath({
      channelPermissions: `${PermissionFlagsBits.ViewChannel}`,
    });
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingSendMessages' });
  });

  it('should reject when a role overwrite denies Send Messages', async () => {
    registerHappyPath({
      overwriteDeny: `${PermissionFlagsBits.SendMessages}`,
    });
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingSendMessages' });
  });

  it('should reject unsupported channel types', async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      {
        id: channelId,
        type: ChannelType.GuildCategory,
        guild_id: guildId,
        name: 'category',
        permission_overwrites: [],
      },
    );

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'unsupportedChannel' });
  });

  it('should reject channels from another guild', async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      {
        id: channelId,
        type: ChannelType.GuildText,
        guild_id: randomDiscordId19(),
        name: 'elsewhere',
        permission_overwrites: [],
      },
    );

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'channelNotFound' });
  });
});
