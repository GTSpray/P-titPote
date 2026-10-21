import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
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

  const discordApiError = (opts: {
    code: number;
    status: number;
    message: string;
  }) =>
    new DiscordAPIError(
      { message: opts.message, code: opts.code },
      opts.code,
      opts.status,
      'GET',
      `/channels/${channelId}`,
      {},
    );

  const registerHappyPath = (opts?: {
    channelType?: ChannelType;
    channelPermissions?: string;
    overwriteDeny?: string;
    overwriteAllow?: string;
    overwriteId?: string;
    overwriteType?: OverwriteType;
    everyoneDeny?: string;
    everyoneAllow?: string;
    memberDeny?: string;
    memberAllow?: string;
    parentId?: string;
    parentOverwrites?: unknown[];
  }) => {
    const channelPermissions =
      opts?.channelPermissions ??
      `${PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.SendMessagesInThreads}`;

    const overwrites: unknown[] = [];
    if (opts?.everyoneDeny || opts?.everyoneAllow) {
      overwrites.push({
        id: guildId,
        type: OverwriteType.Role,
        allow: opts.everyoneAllow ?? '0',
        deny: opts.everyoneDeny ?? '0',
      });
    }
    if (opts?.overwriteDeny || opts?.overwriteAllow) {
      overwrites.push({
        id: opts.overwriteId ?? botRoleId,
        type: opts.overwriteType ?? OverwriteType.Role,
        allow: opts.overwriteAllow ?? '0',
        deny: opts.overwriteDeny ?? '0',
      });
    }
    if (opts?.memberDeny || opts?.memberAllow) {
      overwrites.push({
        id: botUserId,
        type: OverwriteType.Member,
        allow: opts.memberAllow ?? '0',
        deny: opts.memberDeny ?? '0',
      });
    }

    const channelType = opts?.channelType ?? ChannelType.GuildText;
    const isThread =
      channelType === ChannelType.PublicThread ||
      channelType === ChannelType.PrivateThread ||
      channelType === ChannelType.AnnouncementThread;

    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      {
        id: channelId,
        type: channelType,
        guild_id: guildId,
        name: 'welcome',
        parent_id: opts?.parentId ?? null,
        permission_overwrites: isThread ? undefined : overwrites,
      },
    );

    if (opts?.parentId) {
      DiscrodRESTMock.register(
        {
          verb: DiscrodRESTMockVerb.get,
          fullRoute: Routes.channel(opts.parentId),
        },
        {
          id: opts.parentId,
          type: ChannelType.GuildText,
          guild_id: guildId,
          name: 'parent',
          permission_overwrites: opts.parentOverwrites ?? overwrites,
        },
      );
    }

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

  it('should resolve when bot has Administrator', async () => {
    registerHappyPath({
      channelPermissions: `${PermissionFlagsBits.Administrator}`,
    });
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it.each([
    ChannelType.GuildAnnouncement,
    ChannelType.GuildVoice,
    ChannelType.GuildStageVoice,
  ])('should resolve for postable channel type %s', async (channelType) => {
    registerHappyPath({ channelType });
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it('should resolve for a public thread using parent overwrites', async () => {
    const parentId = randomDiscordId19();
    registerHappyPath({
      channelType: ChannelType.PublicThread,
      parentId,
      channelPermissions: `${PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessagesInThreads}`,
    });
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
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      discordApiError({
        code: 50001,
        status: 403,
        message: 'Missing Access',
      }),
    );

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingViewChannel' });
  });

  it('should reject when Discord returns 404 Unknown Channel', async () => {
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      discordApiError({
        code: 10003,
        status: 404,
        message: 'Unknown Channel',
      }),
    );

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'channelNotFound' });
  });

  it('should rethrow unexpected Discord API errors', async () => {
    const err = discordApiError({
      code: 50013,
      status: 403,
      message: 'Missing Permissions',
    });
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.get,
        fullRoute: Routes.channel(channelId),
      },
      err,
    );

    await expect(assertBotCanPostInChannel(guildId, channelId)).rejects.toBe(
      err,
    );
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

  it('should reject when @everyone overwrite denies View Channel', async () => {
    registerHappyPath({
      channelPermissions: `${PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages}`,
      everyoneDeny: `${PermissionFlagsBits.ViewChannel}`,
    });
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingViewChannel' });
  });

  it('should allow when member overwrite grants Send Messages', async () => {
    registerHappyPath({
      channelPermissions: `${PermissionFlagsBits.ViewChannel}`,
      memberAllow: `${PermissionFlagsBits.SendMessages}`,
    });
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });

  it('should reject when member overwrite denies View Channel', async () => {
    registerHappyPath({
      memberDeny: `${PermissionFlagsBits.ViewChannel}`,
    });
    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'missingViewChannel' });
  });

  it('should reject a thread when bot lacks Send Messages In Threads', async () => {
    const parentId = randomDiscordId19();
    registerHappyPath({
      channelType: ChannelType.PrivateThread,
      parentId,
      channelPermissions: `${PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages}`,
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

  it('should reject channels without a guild_id', async () => {
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

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).rejects.toMatchObject({ reason: 'channelNotFound' });
  });

  it('should keep using the thread channel when parent belongs to another guild', async () => {
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
        permission_overwrites: [
          {
            id: botRoleId,
            type: OverwriteType.Role,
            allow: '0',
            deny: `${PermissionFlagsBits.SendMessagesInThreads}`,
          },
        ],
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
          permissions: `${PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessagesInThreads}`,
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

    await expect(
      assertBotCanPostInChannel(guildId, channelId),
    ).resolves.toBeUndefined();
  });
});
