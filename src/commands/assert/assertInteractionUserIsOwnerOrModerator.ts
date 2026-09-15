import type { APIBaseInteraction } from 'discord-api-types/v10';
import type { InteractionType } from 'discord-api-types/v10';
import { assertInteractionUserIsModerator } from './assertInteractionUserIsModerator.js';

type InteractionTypeOpts =
  | InteractionType.ApplicationCommand
  | InteractionType.ModalSubmit
  | InteractionType.MessageComponent;
type InteractionBody = APIBaseInteraction<InteractionTypeOpts, unknown>;

export function assertInteractionUserIsOwnerOrModerator(
  body: InteractionBody,
  ownerUserId: string,
): void {
  const userId = body.member?.user?.id ?? body.user?.id;
  if (userId && userId === ownerUserId) {
    return;
  }
  assertInteractionUserIsModerator(body);
}
