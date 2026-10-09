import { PermissionFlagsBits, Routes } from 'discord-api-types/v10';
import {
  assertBotCanAssignRole,
  BotCannotAssignRoleError,
} from '../../../src/utils/assertBotCanAssignRole.js';
import { DiscrodRESTMock, DiscrodRESTMockVerb } from '../../mocks/discordjs.js';
import { randomDiscordId19 } from '../../mocks/discord-api/utils.js';

describe('assertBotCanAssignRole', () => {
  let guildId: string;
  let botRoleId: string;
  let targetRoleId: string;
  let botUserId: string;
  const previousAppId = process.env.APP_ID;

  beforeEach(() => {
    DiscrodRESTMock.clear();
    guildId = randomDiscordId19();
    botRoleId = randomDiscordId19();
    targetRoleId = randomDiscordId19();
    botUserId = randomDiscordId19();
    process.env.APP_ID = botUserId;
  });

  afterEach(() => {
    process.env.APP_ID = previousAppId;
  });

  const registerRolesAndMember = (opts?: {
    targetPosition?: number;
    botPosition?: number;
    managed?: boolean;
    botPermissions?: string;
  }) => {
    const targetPosition = opts?.targetPosition ?? 1;
    const botPosition = opts?.botPosition ?? 5;
    const managed = opts?.managed ?? false;
    const botPermissions =
      opts?.botPermissions ?? `${PermissionFlagsBits.ManageRoles}`;

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
        roles: [botRoleId],
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

  it('should reject when target role is above bot role', async () => {
    registerRolesAndMember({ targetPosition: 10, botPosition: 5 });
    await expect(
      assertBotCanAssignRole(guildId, targetRoleId),
    ).rejects.toMatchObject({
      reason: 'hierarchy',
    } satisfies Partial<BotCannotAssignRoleError>);
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
