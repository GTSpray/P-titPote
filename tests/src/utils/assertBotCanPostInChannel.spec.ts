import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
  type APIOverwrite,
} from 'discord-api-types/v10';
import { DiscordAPIError } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { t } from '../../../src/i18n/index.js';
import {
  assertBotCanPostInChannel,
  BotCannotPostInChannelError,
} from '../../../src/utils/assertBotCanPostInChannel.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';

const VIEW = PermissionFlagsBits.ViewChannel;
const SEND = PermissionFlagsBits.SendMessages;
const SEND_IN_THREADS = PermissionFlagsBits.SendMessagesInThreads;
const CAN_POST = `${VIEW | SEND | SEND_IN_THREADS}`;

describe('BotCannotPostInChannelError', () => {
  it.each([
    ['missingViewChannel', t('trigger.channel.missingViewChannel')],
    ['missingSendMessages', t('trigger.channel.missingSendMessages')],
    ['unsupportedChannel', t('trigger.channel.unsupported')],
    ['channelNotFound', t('trigger.channel.notFound')],
    ['noAppId', t('trigger.channel.unavailable')],
  ] as const)('toUserMessage maps %s', (reason, expected) => {
    expect(new BotCannotPostInChannelError(reason).toUserMessage()).toBe(
      expected,
    );
  });
});

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

  const roleOverwrite = (
    deny: bigint = 0n,
    allow: bigint = 0n,
  ): APIOverwrite => ({
    id: botRoleId,
    type: OverwriteType.Role,
    allow: `${allow}`,
    deny: `${deny}`,
  });

  const everyoneOverwrite = (
    deny: bigint = 0n,
    allow: bigint = 0n,
  ): APIOverwrite => ({
    id: guildId,
    type: OverwriteType.Role,
    allow: `${allow}`,
    deny: `${deny}`,
  });

  const memberOverwrite = (
    deny: bigint = 0n,
    allow: bigint = 0n,
  ): APIOverwrite => ({
    id: botUserId,
    type: OverwriteType.Member,
    allow: `${allow}`,
    deny: `${deny}`,
  });

  const registerBotRolesAndMember = (botPermissions: string) => {
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
          permissions: botPermissions,
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

  const registerGuildChannel = (
    type: ChannelType,
    overwrites: APIOverwrite[] = [],
  ) => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      {
        id: channelId,
        type,
        guild_id: guildId,
        name: 'welcome',
        permission_overwrites: overwrites,
      },
    );
  };

  const registerThreadOnParent = (
    threadType: ChannelType,
    parentOverwrites: APIOverwrite[] = [],
  ) => {
    const parentId = randomDiscordId19();
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      {
        id: channelId,
        type: threadType,
        guild_id: guildId,
        name: 'thread',
        parent_id: parentId,
      },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(parentId),
      },
      {
        id: parentId,
        type: ChannelType.GuildText,
        guild_id: guildId,
        name: 'parent',
        permission_overwrites: parentOverwrites,
      },
    );
  };

  const registerThreadWithForeignParent = () => {
    const parentId = randomDiscordId19();
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      {
        id: channelId,
        type: ChannelType.AnnouncementThread,
        guild_id: guildId,
        name: 'thread',
        parent_id: parentId,
      },
    );
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(parentId),
      },
      {
        id: parentId,
        type: ChannelType.GuildAnnouncement,
        guild_id: randomDiscordId19(),
        name: 'foreign-parent',
        permission_overwrites: [roleOverwrite(SEND_IN_THREADS)],
      },
    );
  };

  const registerChannelFetchError = (error: DiscordAPIError) => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      error,
    );
  };

  const registerCategoryChannel = () => {
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
  };

  const registerChannelInOtherGuild = () => {
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
  };

  const registerDmChannel = () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      {
        id: channelId,
        type: ChannelType.DM,
        recipients: [],
      },
    );
  };

  const discordApiError = (code: number, status: number, message: string) =>
    new DiscordAPIError(
      { message, code },
      code,
      status,
      'GET',
      `/channels/${channelId}`,
      {},
    );

  it('should resolve when bot can post in the channel', async () => {
    registerBotRolesAndMember(CAN_POST);
    registerGuildChannel(ChannelType.GuildText);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it('should resolve when bot has Administrator', async () => {
    registerBotRolesAndMember(`${PermissionFlagsBits.Administrator}`);
    registerGuildChannel(ChannelType.GuildText);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it.each([
    ChannelType.GuildAnnouncement,
    ChannelType.GuildVoice,
    ChannelType.GuildStageVoice,
  ])('should resolve for postable channel type %s', async (channelType) => {
    registerBotRolesAndMember(CAN_POST);
    registerGuildChannel(channelType);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it('should resolve for a public thread using parent overwrites', async () => {
    registerBotRolesAndMember(`${VIEW | SEND_IN_THREADS}`);
    registerThreadOnParent(ChannelType.PublicThread);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it('should reject when APP_ID is unset', async () => {
    vi.stubEnv('APP_ID', '');

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'noAppId' });

    vi.unstubAllEnvs();
  });

  it('should reject when Discord returns Missing Access (50001)', async () => {
    registerChannelFetchError(discordApiError(50001, 403, 'Missing Access'));

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingViewChannel' });
  });

  it('should reject when Discord returns 404 Unknown Channel', async () => {
    registerChannelFetchError(discordApiError(10003, 404, 'Unknown Channel'));

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'channelNotFound' });
  });

  it('should rethrow unexpected Discord API errors', async () => {
    const err = discordApiError(50013, 403, 'Missing Permissions');
    registerChannelFetchError(err);

    await expect(assertBotCanPostInChannel(guildId, channelId)).rejects.toBe(
      err,
    );
  });

  it('should reject when bot lacks View Channel', async () => {
    registerBotRolesAndMember(`${SEND}`);
    registerGuildChannel(ChannelType.GuildText);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({
      reason: 'missingViewChannel',
    } satisfies Partial<BotCannotPostInChannelError>);
  });

  it('should reject when bot lacks Send Messages', async () => {
    registerBotRolesAndMember(`${VIEW}`);
    registerGuildChannel(ChannelType.GuildText);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingSendMessages' });
  });

  it('should reject when a role overwrite denies Send Messages', async () => {
    registerBotRolesAndMember(CAN_POST);
    registerGuildChannel(ChannelType.GuildText, [roleOverwrite(SEND)]);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingSendMessages' });
  });

  it('should reject when @everyone overwrite denies View Channel', async () => {
    registerBotRolesAndMember(`${VIEW | SEND}`);
    registerGuildChannel(ChannelType.GuildText, [everyoneOverwrite(VIEW)]);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingViewChannel' });
  });

  it('should allow when member overwrite grants Send Messages', async () => {
    registerBotRolesAndMember(`${VIEW}`);
    registerGuildChannel(ChannelType.GuildText, [memberOverwrite(0n, SEND)]);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it('should reject when member overwrite denies View Channel', async () => {
    registerBotRolesAndMember(CAN_POST);
    registerGuildChannel(ChannelType.GuildText, [memberOverwrite(VIEW)]);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingViewChannel' });
  });

  it('should reject a thread when bot lacks Send Messages In Threads', async () => {
    registerBotRolesAndMember(`${VIEW | SEND}`);
    registerThreadOnParent(ChannelType.PrivateThread);

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingSendMessages' });
  });

  it('should reject unsupported channel types', async () => {
    registerCategoryChannel();

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'unsupportedChannel' });
  });

  it('should reject channels from another guild', async () => {
    registerChannelInOtherGuild();

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'channelNotFound' });
  });

  it('should reject channels without a guild_id', async () => {
    registerDmChannel();

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'channelNotFound' });
  });

  it('should keep using the thread channel when parent belongs to another guild', async () => {
    registerBotRolesAndMember(`${VIEW | SEND_IN_THREADS}`);
    registerThreadWithForeignParent();

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });
});
