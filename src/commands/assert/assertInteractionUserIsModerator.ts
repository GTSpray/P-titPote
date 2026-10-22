import type { APIBaseInteraction } from 'discord-api-types/v10';
import type { InteractionType } from 'discord-api-types/v10';
import { t } from '../../i18n/index.js';
import { isModeratorPermissions } from '../../utils/isModeratorPermissions.js';

type InteractionTypeOpts =
  | InteractionType.ApplicationCommand
  | InteractionType.ModalSubmit
  | InteractionType.MessageComponent;
type iModeratorBodyOpts = APIBaseInteraction<InteractionTypeOpts, unknown>;

export function assertInteractionUserIsModerator(body: iModeratorBodyOpts) {
  if (!body.member || !body.member.permissions) {
    throw Error(t('errors.notServerScope'));
  }

  if (!isModeratorPermissions(body.member.permissions)) {
    throw Error(t('errors.notModerator'));
  }
}
