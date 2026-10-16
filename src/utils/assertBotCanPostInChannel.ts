import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
  type APIChannel,
  type APIGuildMember,
  type APIOverwrite,
  type APIRole,
} from 'discord-api-types/v10';
import { DiscordAPIError } from 'discord.js';
import { discordapi } from './discordapi.js';
import { t } from '../i18n/index.js';

export type BotChannelPostError =
  | 'noAppId'
  | 'channelNotFound'
  | 'missingViewChannel'
  | 'missingSendMessages'
  | 'unsupportedChannel';

export class BotCannotPostInChannelError extends Error {
  constructor(public readonly reason: BotChannelPostError) {
    super(reason);
    this.name = 'BotCannotPostInChannelError';
  }

  toUserMessage(): string {
    switch (this.reason) {
      case 'missingViewChannel':
        return t('trigger.channel.missingViewChannel');
      case 'missingSendMessages':
        return t('trigger.channel.missingSendMessages');
      case 'unsupportedChannel':
        return t('trigger.channel.unsupported');
      case 'channelNotFound':
        return t('trigger.channel.notFound');
      default:
        return t('trigger.channel.unavailable');
    }
  }
}

const ALL_PERMISSIONS = PermissionFlagsBits.Administrator;

type ChannelPermissionSource = {
  permission_overwrites?: APIOverwrite[] | null;
  parent_id?: string | null;
};

const isThreadChannel = (type: ChannelType): boolean =>
  type === ChannelType.PublicThread ||
  type === ChannelType.PrivateThread ||
  type === ChannelType.AnnouncementThread;

const isPostableGuildChannel = (type: ChannelType): boolean =>
  type === ChannelType.GuildText ||
  type === ChannelType.GuildAnnouncement ||
  type === ChannelType.GuildVoice ||
  type === ChannelType.GuildStageVoice ||
  isThreadChannel(type);

const computeBasePermissions = (
  guildId: string,
  roles: APIRole[],
  memberRoleIds: string[],
): bigint => {
  let permissions = 0n;
  for (const role of roles) {
    if (role.id === guildId || memberRoleIds.includes(role.id)) {
      permissions |= BigInt(role.permissions);
    }
  }
  return permissions;
};

const computeChannelPermissions = (
  guildId: string,
  basePermissions: bigint,
  memberRoleIds: string[],
  botUserId: string,
  channel: ChannelPermissionSource,
): bigint => {
  if (
    (basePermissions & ALL_PERMISSIONS) ===
    PermissionFlagsBits.Administrator
  ) {
    return ALL_PERMISSIONS;
  }

  let permissions = basePermissions;
  const overwrites = channel.permission_overwrites ?? [];

  const everyoneOverwrite = overwrites.find(
    (overwrite) =>
      overwrite.id === guildId && overwrite.type === OverwriteType.Role,
  );
  if (everyoneOverwrite) {
    permissions &= ~BigInt(everyoneOverwrite.deny);
    permissions |= BigInt(everyoneOverwrite.allow);
  }

  let allow = 0n;
  let deny = 0n;
  for (const overwrite of overwrites) {
    if (
      overwrite.type === OverwriteType.Role &&
      memberRoleIds.includes(overwrite.id)
    ) {
      allow |= BigInt(overwrite.allow);
      deny |= BigInt(overwrite.deny);
    }
  }
  permissions &= ~deny;
  permissions |= allow;

  const memberOverwrite = overwrites.find(
    (overwrite) =>
      overwrite.id === botUserId && overwrite.type === OverwriteType.Member,
  );
  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny);
    permissions |= BigInt(memberOverwrite.allow);
  }

  return permissions;
};

const hasPermission = (permissions: bigint, flag: bigint): boolean =>
  (permissions & ALL_PERMISSIONS) === PermissionFlagsBits.Administrator ||
  (permissions & flag) === flag;

/**
 * Ensures the bot can post in `channelId` (View Channel + Send Messages).
 * Throws {@link BotCannotPostInChannelError} when it cannot.
 */
export const assertBotCanPostInChannel = async (
  guildId: string,
  channelId: string,
): Promise<void> => {
  const botUserId = process.env.APP_ID;
  if (!botUserId) {
    throw new BotCannotPostInChannelError('noAppId');
  }

  let channel: APIChannel;
  try {
    channel = (await discordapi.get(Routes.channel(channelId))) as APIChannel;
  } catch (err) {
    if (err instanceof DiscordAPIError && err.code === 50001) {
      throw new BotCannotPostInChannelError('missingViewChannel');
    }
    if (err instanceof DiscordAPIError && err.status === 404) {
      throw new BotCannotPostInChannelError('channelNotFound');
    }
    throw err;
  }

  if (!('guild_id' in channel) || channel.guild_id !== guildId) {
    throw new BotCannotPostInChannelError('channelNotFound');
  }

  if (!isPostableGuildChannel(channel.type)) {
    throw new BotCannotPostInChannelError('unsupportedChannel');
  }

  let permissionSource: ChannelPermissionSource =
    channel as ChannelPermissionSource;

  // Threads inherit overwrites from their parent channel.
  if (
    isThreadChannel(channel.type) &&
    'parent_id' in channel &&
    channel.parent_id
  ) {
    const parent = (await discordapi.get(
      Routes.channel(channel.parent_id),
    )) as APIChannel;
    if ('guild_id' in parent && parent.guild_id === guildId) {
      permissionSource = parent as ChannelPermissionSource;
    }
  }

  const roles = (await discordapi.get(Routes.guildRoles(guildId))) as APIRole[];
  const botMember = (await discordapi.get(
    Routes.guildMember(guildId, botUserId),
  )) as APIGuildMember;

  const basePermissions = computeBasePermissions(
    guildId,
    roles,
    botMember.roles,
  );
  const permissions = computeChannelPermissions(
    guildId,
    basePermissions,
    botMember.roles,
    botUserId,
    permissionSource,
  );

  if (!hasPermission(permissions, PermissionFlagsBits.ViewChannel)) {
    throw new BotCannotPostInChannelError('missingViewChannel');
  }

  const sendFlag = isThreadChannel(channel.type)
    ? PermissionFlagsBits.SendMessagesInThreads
    : PermissionFlagsBits.SendMessages;

  if (!hasPermission(permissions, sendFlag)) {
    throw new BotCannotPostInChannelError('missingSendMessages');
  }
};
