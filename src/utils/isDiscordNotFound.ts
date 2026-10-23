import { RESTJSONErrorCodes } from 'discord-api-types/v10';

const DISCORD_NOT_FOUND_CODES = new Set<number>([
  RESTJSONErrorCodes.UnknownChannel,
  RESTJSONErrorCodes.UnknownGuild,
  RESTJSONErrorCodes.UnknownMember,
  RESTJSONErrorCodes.UnknownMessage,
]);

export function isDiscordNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error as { status?: number; code?: number };
  if (err.status === 404) {
    return true;
  }
  return DISCORD_NOT_FOUND_CODES.has(err.code ?? -1);
}
