import { PermissionFlagsBits } from 'discord-api-types/v10';

const PERMISSIONS = {
  ADMINISTRATOR: 0x8n,
  MANAGE_GUILD: 0x20n,
  MANAGE_CHANNELS: 0x10n,
  MANAGE_MESSAGES: 0x2000n,
  MANAGE_ROLES: PermissionFlagsBits.ManageRoles,
  KICK_MEMBERS: 0x2n,
  BAN_MEMBERS: 0x4n,
};

/** True when the permission bitfield includes any moderator capability. */
export function isModeratorPermissions(permissions: string): boolean {
  const perms = BigInt(permissions);
  return !!(
    perms & PERMISSIONS.ADMINISTRATOR ||
    perms & PERMISSIONS.MANAGE_GUILD ||
    perms & PERMISSIONS.MANAGE_CHANNELS ||
    perms & PERMISSIONS.MANAGE_MESSAGES ||
    perms & PERMISSIONS.KICK_MEMBERS ||
    perms & PERMISSIONS.BAN_MEMBERS
  );
}

/** True when the permission bitfield can manage role assignment. */
export function isManageRolesPermissions(permissions: string): boolean {
  const perms = BigInt(permissions);
  return !!(
    perms & PERMISSIONS.ADMINISTRATOR || perms & PERMISSIONS.MANAGE_ROLES
  );
}
