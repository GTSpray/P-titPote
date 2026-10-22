import { PermissionFlagsBits, Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';
import { t } from '../../../src/i18n/index.js';
import {
  assertBotCanAssignRole,
  BotCannotAssignRoleError,
} from '../../../src/utils/assertBotCanAssignRole.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';

describe('BotCannotAssignRoleError', () => {
  it.each([
    ['managedRole', t('trigger.role.managed')],
    ['everyoneRole', t('trigger.role.everyone')],
    ['missingManageRoles', t('trigger.role.missingManageRoles')],
    ['hierarchy', t('trigger.role.hierarchy')],
    ['noAppId', t('trigger.role.unavailable')],
    ['roleNotFound', t('trigger.role.unavailable')],
  ] as const)('toUserMessage maps %s', (reason, expected) => {
    expect(new BotCannotAssignRoleError(reason).toUserMessage()).toBe(expected);
  });
});

describe('assertBotCanAssignRole', () => {
  let guildId: string;
  let botRoleId: string;
  let targetRoleId: string;
  const botUserId = process.env.APP_ID!;

  beforeEach(() => {
    DiscrodRESTMock.clear();
    guildId = randomDiscordId19();
    botRoleId = randomDiscordId19();
    targetRoleId = randomDiscordId19();
  });

  const registerRolesAndMember = (opts?: {
    targetPosition?: number;
    botPosition?: number;
    managed?: boolean;
    botPermissions?: string;
    everyonePermissions?: string;
    botMemberRoles?: string[];
  }) => {
    const targetPosition = opts?.targetPosition ?? 1;
    const botPosition = opts?.botPosition ?? 5;
    const managed = opts?.managed ?? false;
    const botPermissions =
      opts?.botPermissions ?? `${PermissionFlagsBits.ManageRoles}`;
    const everyonePermissions = opts?.everyonePermissions ?? '0';

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
          permissions: everyonePermissions,
          managed: false,
        },
        {
          id: targetRoleId,
          name: 'Member',
          position: targetPosition,
          permissions: '0',
          managed,
        },
        {
          id: botRoleId,
          name: 'Bot',
          position: botPosition,
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
        roles: opts?.botMemberRoles ?? [botRoleId],
        user: { id: botUserId },
      },
    );
  };

  it('should resolve when bot can assign the role', async () => {
    registerRolesAndMember();
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).resolves.toBeUndefined();
  });

  it('should resolve when bot has Administrator', async () => {
    registerRolesAndMember({
      botPermissions: `${PermissionFlagsBits.Administrator}`,
    });
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).resolves.toBeUndefined();
  });

  it('should resolve when Manage Roles comes from @everyone', async () => {
    registerRolesAndMember({
      botPermissions: '0',
      everyonePermissions: `${PermissionFlagsBits.ManageRoles}`,
    });
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).resolves.toBeUndefined();
  });

  it('should reject when APP_ID is unset', async () => {
    vi.stubEnv('APP_ID', '');
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).rejects.toMatchObject({ reason: 'noAppId' });
    vi.unstubAllEnvs();
  });

  it('should reject when the role is not found', async () => {
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
      ],
    );

    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).rejects.toMatchObject({ reason: 'roleNotFound' });
  });

  it('should reject when target role is above bot role', async () => {
    registerRolesAndMember({ targetPosition: 10, botPosition: 5 });
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).rejects.toMatchObject({
      reason: 'hierarchy',
    } satisfies Partial<BotCannotAssignRoleError>);
  });

  it('should reject when target role is at the same position as bot', async () => {
    registerRolesAndMember({ targetPosition: 5, botPosition: 5 });
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).rejects.toMatchObject({ reason: 'hierarchy' });
  });

  it('should reject when bot has no roles (hierarchy defaults to 0)', async () => {
    registerRolesAndMember({
      targetPosition: 0,
      botMemberRoles: [],
      everyonePermissions: `${PermissionFlagsBits.ManageRoles}`,
      botPermissions: '0',
    });
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).rejects.toMatchObject({ reason: 'hierarchy' });
  });

  it('should reject managed roles', async () => {
    registerRolesAndMember({ managed: true });
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).rejects.toMatchObject({ reason: 'managedRole' });
  });

  it('should reject when bot lacks Manage Roles', async () => {
    registerRolesAndMember({ botPermissions: '0' });
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).rejects.toMatchObject({ reason: 'missingManageRoles' });
  });

  it('should reject @everyone', async () => {
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
      ],
    );
    await expect(
      assertBotCanAssignRole(guildId, guildId),
    ).rejects.toMatchObject({ reason: 'everyoneRole' });
  });
});
