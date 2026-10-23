import { Routes } from 'discord-api-types/v10';
import { discordapi } from './discordapi.js';
import { isDiscordNotFound } from './isDiscordNotFound.js';

export async function isBotInGuild(guildId: string): Promise<boolean> {
  try {
    // Bot token: GET /guilds/{id}. userGuildMember is OAuth-only (20001 for bots).
    await discordapi.get(Routes.guild(guildId));
    return true;
  } catch (error) {
    if (isDiscordNotFound(error)) {
      return false;
    }
    throw error;
  }
}
