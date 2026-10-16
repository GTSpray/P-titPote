import {
  PermissionFlagsBits,
  Routes,
  type APIGuildMember,
  type APIRole,
} from 'discord-api-types/v10';
import { discordapi } from './discordapi.js';
import { t } from '../i18n/index.js';

export type BotRoleAssignError =
  | 'noAppId'
  | 'roleNotFound'
  | 'managedRole'
  | 'everyoneRole'
  | 'missingManageRoles'
  | 'hierarchy';

export class BotCannotAssignRoleError extends Error {
  constructor(public readonly reason: BotRoleAssignError) {
    super(reason);
    this.name = 'BotCannotAssignRoleError';
  }

  toUserMessage(): string {
    switch (this.reason) {
      case 'managedRole':
        return t('trigger.role.managed');
      case 'everyoneRole':
        return t('trigger.role.everyone');
      case 'missingManageRoles':
        return t('trigger.role.missingManageRoles');
      case 'hierarchy':
        return t('trigger.role.hierarchy');
      default:
        return t('trigger.role.unavailable');
    }
  }
}

const botHasManageRoles = (
  guildId: string,
  roles: APIRole[],
  memberRoleIds: string[],
): boolean => {
  let permissions = 0n;
  for (const role of roles) {
    if (role.id === guildId || memberRoleIds.includes(role.id)) {
      permissions |= BigInt(role.permissions);
    }
  }

  return (
    (permissions & PermissionFlagsBits.Administrator) ===
      PermissionFlagsBits.Administrator ||
    (permissions & PermissionFlagsBits.ManageRoles) ===
      PermissionFlagsBits.ManageRoles
  );
};

/**
 * Ensures the bot can assign `roleId` in `guildId` (Manage Roles + hierarchy).
 * Throws {@link BotCannotAssignRoleError} when it cannot.
 */
export const assertBotCanAssignRole = async (
  guildId: string,
  roleId: string,
): Promise<void> => {
  const botUserId = process.env.APP_ID;
  if (!botUserId) {
    throw new BotCannotAssignRoleError('noAppId');
  }

  const roles = (await discordapi.get(Routes.guildRoles(guildId))) as APIRole[];
  const target = roles.find((role) => role.id === roleId);
  if (!target) {
    throw new BotCannotAssignRoleError('roleNotFound');
  }
  if (target.id === guildId) {
    throw new BotCannotAssignRoleError('everyoneRole');
  }
  if (target.managed) {
    throw new BotCannotAssignRoleError('managedRole');
  }

  const botMember = (await discordapi.get(
    Routes.guildMember(guildId, botUserId),
  )) as APIGuildMember;

  if (!botHasManageRoles(guildId, roles, botMember.roles)) {
    throw new BotCannotAssignRoleError('missingManageRoles');
  }

  const botPositions = roles
    .filter((role) => botMember.roles.includes(role.id))
    .map((role) => role.position);
  const botTop = botPositions.length > 0 ? Math.max(...botPositions) : 0;

  if (target.position >= botTop) {
    throw new BotCannotAssignRoleError('hierarchy');
  }
};
