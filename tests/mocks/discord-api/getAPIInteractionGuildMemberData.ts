import { APIInteractionGuildMember, GuildMemberFlags } from "discord.js";
import { randomDiscordId16 } from "./utils.js";
import { getApiUserData } from "./getApiUserData.js";

export const getAPIInteractionGuildMemberData = (
  options: Partial<APIInteractionGuildMember> = {},
): APIInteractionGuildMember => {
  return {
    avatar: null,
    banner: null,
    // collectibles: null,
    communication_disabled_until: null,
    deaf: false,
    flags: GuildMemberFlags.DidRejoin,
    joined_at: "2025-08-28T17:23:07.191000+00:00",
    mute: false,
    nick: "a random nick",
    pending: false,
    permissions: randomDiscordId16(),
    premium_since: null,
    roles: [],
    // unusual_dm_activity_until: null,
    user: getApiUserData(),
    ...options,
  };
};
