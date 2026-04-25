import { type APIBaseInteraction, type InteractionType } from "discord.js";

type InteractionTypeOpts = InteractionType.ApplicationCommand;
type iModeratorBodyOpts = APIBaseInteraction<InteractionTypeOpts, unknown>;

const PERMISSIONS = {
  ADMINISTRATOR: 0x8n,
  MANAGE_GUILD: 0x20n,
  MANAGE_CHANNELS: 0x10n,
  MANAGE_MESSAGES: 0x2000n,
  KICK_MEMBERS: 0x2n,
  BAN_MEMBERS: 0x4n,
};

export function assertInteractionUserIsModerator(body: iModeratorBodyOpts) {
  if (!body.member || !body.member.permissions) {
    throw Error("not server scope");
  }
  const perms = BigInt(body.member.permissions);

  const isModerator =
    perms & PERMISSIONS.ADMINISTRATOR ||
    perms & PERMISSIONS.MANAGE_GUILD ||
    perms & PERMISSIONS.MANAGE_CHANNELS ||
    perms & PERMISSIONS.MANAGE_MESSAGES ||
    perms & PERMISSIONS.KICK_MEMBERS ||
    perms & PERMISSIONS.BAN_MEMBERS;

  if (!isModerator) {
    throw Error("not moderator");
  }
}
